# backend/routers/farmer_assistant.py
import io
import base64
import asyncio
import logging
import os
from pathlib import Path
from dotenv import load_dotenv
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
load_dotenv(Path(__file__).resolve().parents[1] / ".env")
client = genai.Client()

# Resilient Model Failover Cascade
CANDIDATE_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.6-flash"
    
]

# ---------------------------------------------------------
# Schemas for Structured Voice & Advisory Output
# ---------------------------------------------------------
class AssistantStructuredResponse(BaseModel):
    detailed_advisory: str = Field(
        description="Comprehensive practical answer with step-by-step guidance in target language. Covers all crops, diseases, seeds, weather, mandi advice, government schemes, and general rural questions."
    )
    voice_advisory: str = Field(
        description="Conversational, reassuring 2-3 sentence verbal script composed purely for speech playback. Must contain NO markdown, NO asterisks, and NO bullet points."
    )
    voice_commands: List[str] = Field(
        description="Short, crisp imperative action phrases or tips for the farmer (e.g., 'आज छिड़काव न करें', 'ढैंचा की बुवाई करें', 'नजदीकी मंडी संपर्क करें')."
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
You are 'Kisan Mitra' (किसान मित्र), a warm, empathetic, and exceptionally knowledgeable agronomic and rural companion for Indian farmers on CropIndia.

Core Rules & Behavior:
1. Universal Scope & Helpfulness:
   - Answer ANY question the farmer asks clearly, practically, and respectfully.
   - Topics include: crop disease diagnosis, pests, fertilizers, bio-remedies, organic formulations, sowing & harvesting seasons, seed varieties, soil health, weather impact, irrigation, government schemes (PM-Kisan, PMFBY, KCC), mandi prices guidance, and dairy/livestock.
   - For greetings (e.g., 'Namaste', 'Kaise ho'), respond warmly and ask about their farm and well-being.
   - If a query touches non-farming topics, provide a helpful answer and connect it back warmly to rural livelihood rather than refusing.

2. Language & Tone:
   - Output all text, voice advisories, and voice commands strictly in the specified `target_language` (e.g., Hindi, Marathi, Bengali, English).
   - Use simple, respectful vernacular phrasing (e.g., 'किसान भाई' in Hindi). Avoid dense academic or chemical jargon.
   - `voice_advisory`: Write 2-3 short, spoken sentences that sound natural when spoken aloud. Strictly NO markdown, NO asterisks, and NO bullet points.
   - `voice_commands`: Provide 1 to 3 crisp, immediate action points.

3. Weather & Telemetry:
   - If [REAL-TIME FIELD WEATHER] shows rain or wind speed > 15 km/h, advise against pesticide/fertilizer spraying and set `action_intent` to `DO_NOT_SPRAY`.

4. Agronomic Best Practices:
   - Prioritize cost-effective, biological, and regenerative remedies (Jeevamrit, sour buttermilk/chaach, neem extract, Trichoderma, green manuring) while acknowledging standard recommended practices.
"""


def _get_fallback_response(query_text: Optional[str], target_lang: str) -> AssistantStructuredResponse:
    """Guarantees a clean, non-crashing response if all AI calls are temporarily throttled."""
    is_hindi = (target_lang or "hi").startswith("hi")
    
    if is_hindi:
        return AssistantStructuredResponse(
            detailed_advisory=(
                "किसान भाई, आपके सवाल पर विचार किया जा रहा है। सामान्य कृषि सलाह के अनुसार, "
                "फसल में किसी भी लक्षण के लिए पहले जैविक उपचार जैसे नीम का तेल (5 मिली प्रति लीटर पानी) "
                "या खट्टी छाछ का छिड़काव उपयोगी रहता है। मिट्टी में उचित नमी बनाए रखें और अधिक जानकारी के लिए कुछ क्षण बाद पुनः पूछें।"
            ),
            voice_advisory="किसान भाई, आपकी सहायता के लिए सलाह तैयार है। खेत में जैविक नीम के घोल का छिड़काव करें और मिट्टी में नमी की जांच करें।",
            voice_commands=["नीम के अर्क का छिड़काव करें", "खेत में नमी की जांच करें"],
            action_intent="GENERAL_ADVISORY"
        )
    else:
        return AssistantStructuredResponse(
            detailed_advisory=(
                "Dear farmer, for general crop health and protection, preventive application of 5% Neem Seed Kernel Extract (NSKE) "
                "or biological bio-fungicides is recommended. Ensure adequate soil moisture and balanced nutrient management."
            ),
            voice_advisory="Dear farmer, please maintain optimal soil moisture and inspect foliage for early symptoms before spraying.",
            voice_commands=["Check soil moisture", "Apply organic neem extract"],
            action_intent="GENERAL_ADVISORY"
        )


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

    media_contents = []

    # 1. Process Image
    if image_file:
        image_bytes = await image_file.read()
        try:
            pil_img = Image.open(io.BytesIO(image_bytes))
            media_contents.append(pil_img)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid image file format.")

    # 2. Process Incoming Voice Audio
    if audio_file:
        audio_bytes = await audio_file.read()
        mime_type = audio_file.content_type or "audio/mp3"
        media_contents.append(types.Part.from_bytes(data=audio_bytes, mime_type=mime_type))

    # 3. Retrieve Weather Telemetry & Build Prompt
    prompt_sections = []

    if latitude is not None and longitude is not None:
        try:
            weather = await get_current_weather(latitude, longitude)
            if weather:
                prompt_sections.append(
                    f"[REAL-TIME FIELD WEATHER at Lat: {latitude}, Lon: {longitude}]\n"
                    f"- Temperature: {weather.get('temperature_c', 'N/A')}°C\n"
                    f"- Relative Humidity: {weather.get('humidity_pct', 'N/A')}%\n"
                    f"- Current Precipitation: {weather.get('current_precipitation_mm', 0)} mm\n"
                    f"- Max Rain Probability (Next 12h): {weather.get('next_12h_rain_chance_pct', 0)}%\n"
                )
        except Exception as weather_err:
            logger.warning(f"Weather lookup skipped: {weather_err}")

    if query_text:
        prompt_sections.append(f"Farmer Query: {query_text}")

    prompt_sections.append(
        f"MANDATORY: Return the structured JSON response in language code '{target_language or 'hi'}'. "
        f"Provide comprehensive detailed recommendations, crisp imperative commands, and a natural spoken script."
    )

    full_prompt_text = "\n\n".join(prompt_sections)
    contents = [*media_contents, full_prompt_text]

    # Permissive safety settings to avoid false blocks on agricultural chemicals/pests
    safety_settings = [
        types.SafetySetting(
            category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold=types.HarmBlockThreshold.BLOCK_ONLY_HIGH,
        ),
        types.SafetySetting(
            category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold=types.HarmBlockThreshold.BLOCK_ONLY_HIGH,
        ),
        types.SafetySetting(
            category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold=types.HarmBlockThreshold.BLOCK_ONLY_HIGH,
        ),
        types.SafetySetting(
            category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold=types.HarmBlockThreshold.BLOCK_ONLY_HIGH,
        ),
    ]

    parsed_result: Optional[AssistantStructuredResponse] = None

    # 4. Try Models sequentially to guarantee resilience against rate limits
    for model_name in CANDIDATE_MODELS:
        try:
            logger.info(f"Querying model: {model_name}")
            response = await async_generate_content_with_backoff(
                client=client,
                model=model_name,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    response_mime_type="application/json",
                    response_schema=AssistantStructuredResponse,
                    temperature=0.3,
                    safety_settings=safety_settings,
                ),
                max_retries=2,
                base_delay=1.0,
            )

            if response and response.text:
                parsed_result = AssistantStructuredResponse.model_validate_json(response.text.strip())
                break
        except Exception as exc:
            logger.warning(f"Model {model_name} failed: {exc}")
            continue

    # 5. Graceful fallback if cloud rate limits are reached
    if not parsed_result:
        logger.error("All AI models were unavailable or rate-limited. Serving graceful advisory.")
        parsed_result = _get_fallback_response(query_text, target_language or "hi")

    # 6. Generate Voice Audio (Non-blocking worker thread)
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
        "audio_base64": audio_base64,
    }