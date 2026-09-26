# backend/routers/farmer_assistant.py
import io
import base64
import asyncio
import logging
from typing import Optional, List
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from PIL import Image

from backend.services.weather import get_current_weather
from backend.utils.gemini_client import async_generate_content_with_backoff

# Optional: Text-to-Speech synthesis
try:
    from gtts import gTTS
    HAS_GTTS = True
except ImportError:
    HAS_GTTS = False

logger = logging.getLogger("cropindia.farmer_assistant")

router = APIRouter(prefix="/api/v1/farmer", tags=["Farmer Multimodal Assistant"])

# Initialize Google GenAI client
client = genai.Client()


# ---------------------------------------------------------
# Schemas for Structured Voice & Advisory Output
# ---------------------------------------------------------
class AssistantStructuredResponse(BaseModel):
    detailed_advisory: str = Field(
        description="Comprehensive agronomic advisory with step-by-step guidance in target language."
    )
    voice_advisory: str = Field(
        description="Conversational, reassuring 2-3 sentence verbal script composed purely for speech playback. Must contain NO markdown, NO asterisks, and NO bullet points."
    )
    voice_commands: List[str] = Field(
        description="Short, crisp imperative action phrases or warnings for the farmer (e.g., 'आज छिड़काव न करें', 'ढैंचा की बुवाई करें')."
    )
    action_intent: str = Field(
        description="System intent tag: DO_NOT_SPRAY, IRRIGATE_NOW, APPLY_BIO_PESTICIDE, DRAIN_FIELD, SAFE_TO_SPRAY, or GENERAL_ADVISORY."
    )


# ---------------------------------------------------------
# Audio Synthesis Helper
# ---------------------------------------------------------
def synthesize_speech_base64(text: str, lang_code: str = "hi") -> Optional[str]:
    """Synthesizes text into base64 MP3 audio using gTTS."""
    if not HAS_GTTS or not text:
        return None
    try:
        supported_langs = {"hi", "bn", "te", "ta", "mr", "gu", "kn", "ml", "pa", "en"}
        clean_lang = lang_code.lower().split("-")[0]
        selected_lang = clean_lang if clean_lang in supported_langs else "hi"

        tts = gTTS(text=text, lang=selected_lang, slow=False)
        audio_stream = io.BytesIO()
        tts.write_to_fp(audio_stream)
        audio_stream.seek(0)
        return base64.b64encode(audio_stream.read()).decode("utf-8")
    except Exception as exc:
        logger.warning(f"Voice synthesis failed: {exc}")
        return None


SYSTEM_INSTRUCTION = """
You are an expert agronomic and agro-climatic assistant for CropIndia.
Your core rules:
1. Output Language Priority:
   - Formulate all text, voice advisory, and voice commands strictly in the specified `target_language` (e.g., Hindi, Bengali, English).
   - If no target language is provided, detect the farmer's native dialect and script from the query/audio and mirror it.
2. Voice Advisory & Commands:
   - `voice_advisory`: Write 2-3 short, spoken sentences that sound warm, respectful, and reassuring (like an experienced local agronomist speaking to a farmer). Avoid technical jargon, bullet points, or markdown formatting.
   - `voice_commands`: Provide 1 to 3 punchy, spoken action commands that immediately tell the farmer what to do or avoid.
3. Weather and Telemetry:
   - If rain or high wind is imminent according to [REAL-TIME FIELD WEATHER], explicitly command the farmer NOT to spray and set `action_intent` to `DO_NOT_SPRAY`.
4. Agronomic Principles:
   - Prioritize biological, regenerative measures (Jeevamrit, sour buttermilk/chaach, neem oil, green manuring) over chemical inputs.
"""


@router.post("/query")
async def process_farmer_query(
    query_text: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    image_file: Optional[UploadFile] = File(None),
    audio_file: Optional[UploadFile] = File(None),
    target_language: Optional[str] = Form("hi"),
):
    if not query_text and not audio_file and not image_file:
        raise HTTPException(
            status_code=400,
            detail="Provide at least one input: query text, an audio clip, or an image.",
        )

    contents = []

    # 1. Process Image
    if image_file:
        image_bytes = await image_file.read()
        try:
            pil_img = Image.open(io.BytesIO(image_bytes))
            contents.append(pil_img)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid image file format.")

    # 2. Process Incoming Voice Audio
    if audio_file:
        audio_bytes = await audio_file.read()
        mime_type = audio_file.content_type or "audio/mp3"
        contents.append(types.Part.from_bytes(data=audio_bytes, mime_type=mime_type))

    # 3. Retrieve Weather Telemetry & Build Prompt
    prompt_sections = []

    if latitude is not None and longitude is not None:
        weather = await get_current_weather(latitude, longitude)
        if weather:
            prompt_sections.append(
                f"[REAL-TIME FIELD WEATHER at Lat: {latitude}, Lon: {longitude}]\n"
                f"- Temperature: {weather['temperature_c']}°C\n"
                f"- Relative Humidity: {weather['humidity_pct']}%\n"
                f"- Current Precipitation: {weather['current_precipitation_mm']} mm\n"
                f"- Max Rain Probability (Next 12h): {weather['next_12h_rain_chance_pct']}%\n"
            )

    if query_text:
        prompt_sections.append(f"Farmer Query: {query_text}")

    prompt_sections.append(
        f"MANDATORY: Return the response in language code '{target_language}'. "
        f"Formulate both detailed recommendations and simple spoken voice commands."
    )

    contents.append("\n".join(prompt_sections))

    # 4. Generate Content with Pydantic Schema
    try:
        response = await async_generate_content_with_backoff(
            client=client,
            model="gemini-3.6-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                response_schema=AssistantStructuredResponse,
                temperature=0.2,
            ),
            max_retries=3,
            base_delay=1.5,
        )

        parsed_result = AssistantStructuredResponse.model_validate_json(response.text.strip())

        # 5. Generate Voice Audio (Non-blocking worker thread)
        audio_base64 = await asyncio.to_thread(
            synthesize_speech_base64,
            parsed_result.voice_advisory,
            target_language or "hi",
        )

        return {
            "status": "success",
            "detailed_response": parsed_result.detailed_advisory,
            "voice_advisory": parsed_result.voice_advisory,
            "voice_commands": parsed_result.voice_commands,
            "action_intent": parsed_result.action_intent,
            "audio_base64": audio_base64,  # Frontend plays with data:audio/mp3;base64,{audio_base64}
        }

    except Exception as exc:
        logger.error(f"Farmer query failed: {exc}", exc_info=True)
        raise HTTPException(
            status_code=503,
            detail="The agricultural assistant is currently handling peak traffic. Please try again shortly.",
        )