# backend/routers/farmer_assistant.py
import io
import logging
from typing import Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from google import genai
from google.genai import types
from PIL import Image

from backend.services.weather import get_current_weather
from backend.utils.gemini_client import async_generate_content_with_backoff

logger = logging.getLogger("cropindia.farmer_assistant")

router = APIRouter(prefix="/api/v1/farmer", tags=["Farmer Multimodal Assistant"])

# Initialize Google GenAI client
client = genai.Client()

SYSTEM_INSTRUCTION = """
You are an expert agronomic and agro-climatic assistant for CropIndia.
Your core rules:
1. Output Language Priority:
   - If a target language is specified via `target_language` or if the user explicitly asks for a language (e.g., "tell me in English", "हिंदी में बताओ", "বাংলায় বলুন"), formulate the entire response strictly in that requested language and script.
   - If no target language is requested, identify the farmer's native language/script from their audio or text query and mirror that identical language.
2. Weather and Telemetry:
   - If the farmer asks about rain, temperature, humidity, spraying suitability, or irrigation, refer directly to the [REAL-TIME FIELD WEATHER] context provided.
   - If heavy rain or high winds are forecasted, warn the farmer against spraying foliar treatments.
3. Multimodal Diagnosis:
   - If an image is provided, inspect crop leaves, stems, or soil for physical symptoms, pests, or deficiencies.
   - If an audio clip is provided, transcribe and address the farmer's spoken intent.
4. Agronomic Principles:
   - Prioritize biological, regenerative, and zero-chemical measures (sour buttermilk/chaach, neem oil/karanj spray, Jeevamrit, Trichoderma).
5. Tone: Concise, practical, empathetic, and easily actionable for farmers.
"""

@router.post("/query")
async def process_farmer_query(
    query_text: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    image_file: Optional[UploadFile] = File(None),
    audio_file: Optional[UploadFile] = File(None),
    target_language: Optional[str] = Form(None),
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

    # 2. Process Voice Audio
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

    if target_language and target_language.strip():
        prompt_sections.append(
            f"MANDATORY OUTPUT REQUIREMENT: Compose the entire final response strictly in language '{target_language}'."
        )
    else:
        prompt_sections.append(
            "Detect the language and script of the input query/audio and respond strictly in that language."
        )

    contents.append("\n".join(prompt_sections))

    # 4. Generate Content with Exponential Backoff
    try:
        response = await async_generate_content_with_backoff(
            client=client,
            model="gemini-3.6-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                temperature=0.2,
            ),
            max_retries=4,
            base_delay=2.0,
        )

        return {
            "status": "success",
            "detected_response": response.text,
        }

    except Exception as exc:
        logger.error(f"Farmer query failed after retries: {exc}")
        raise HTTPException(
            status_code=503,
            detail="The agricultural assistant is currently handling peak traffic. Please try again shortly.",
        )