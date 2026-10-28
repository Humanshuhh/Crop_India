# backend/services/assistant_service.py

import asyncio
import base64
import io
import logging
import os
from typing import List, Optional

from PIL import Image, ImageOps
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

from backend.services.weather import get_current_weather
from backend.utils.gemini_client import async_generate_content_with_backoff

try:
    from gtts import gTTS
    HAS_GTTS = True
except ImportError:
    HAS_GTTS = False

logger = logging.getLogger("cropindia.assistant_service")


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


def resolve_api_key() -> Optional[str]:
    return (
        os.getenv("GEMINI_API_KEY")
        or os.getenv("GOOGLE_API_KEY")
        or os.getenv("GOOGLE_GENAI_API_KEY")
    )


SYSTEM_INSTRUCTION = """
You are 'Kisan Mitra' (किसान मित्र), a warm, empathetic, and exceptionally knowledgeable agronomic and rural companion for Indian farmers on CropIndia.

Core Rules & Behavior:
1. Universal Scope & Helpfulness:
   - Answer ANY agricultural question clearly, practically, and respectfully: diseases, pests, bio-remedies, organic formulations, sowing & harvesting, seeds, soil health, weather impact, irrigation, government schemes (PM-Kisan, PMFBY, KCC), mandi prices, and dairy/livestock.
   - For greetings (e.g., 'Namaste', 'Kaise ho'), respond warmly in one line and ask about their farm and well-being.
2. Language & Tone:
   - Output all fields strictly in `target_language`.
   - Use simple, respectful vernacular phrasing (e.g., 'किसान भाई' in Hindi). Avoid academic or dense chemical jargon.
   - `voice_advisory`: EXACTLY 2-3 short, conversational sentences for direct TTS. Strictly NO markdown, NO asterisks, and NO bullet points.
   - `voice_commands`: Provide 1 to 3 crisp, immediate action points.
3. Weather Adaptation:
   - If [REAL-TIME FIELD WEATHER] shows rainfall or wind speed > 15 km/h, advise against spraying and set `action_intent` to `DO_NOT_SPRAY`.
4. Agronomic Practices:
   - Prioritize cost-effective, biological, and regenerative remedies (Jeevamrit, sour buttermilk/chaach, neem extract, Trichoderma, green manuring).
"""


class FarmerAssistantService:
    def __init__(self):
        self.api_key = resolve_api_key()
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None
        
        # Validated low-latency endpoints
        self.candidate_models = [
            "gemini-3.5-flash-lite",
            "gemini-3.8-flash",
        ]

    @staticmethod
    def preprocess_image(image_bytes: bytes, max_dim: int = 768, quality: int = 80) -> bytes:
        """Downscales image to single-tile budget (768px Bilinear) for rapid vision encoding."""
        with Image.open(io.BytesIO(image_bytes)) as img:
            img = ImageOps.exif_transpose(img)
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            img.thumbnail((max_dim, max_dim), Image.Resampling.BILINEAR)
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=quality, optimize=False)
            return buf.getvalue()

    @staticmethod
    def synthesize_speech(text: str, lang_code: str = "hi") -> Optional[str]:
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
            logger.warning(f"Voice synthesis skipped or failed: {exc}")
            return None

    @staticmethod
    def get_fallback_advisory(target_lang: str) -> AssistantStructuredResponse:
        """Guarantees a clean advisory during peak traffic congestion."""
        is_hindi = (target_lang or "hi").startswith("hi")
        if is_hindi:
            return AssistantStructuredResponse(
                detailed_advisory=(
                    "किसान भाई, सर्वर पर अधिक लोड होने के कारण यह सामान्य जैविक सलाह जारी की जा रही है। "
                    "फसल में कीट या रोग से बचाव के लिए 5% नीम के बीज का अर्क (NSKE) या खट्टी छाछ का छिड़काव उपयोगी रहता है। "
                    "खेत में उचित नमी बनाए रखें और कुछ क्षण बाद पुनः प्रयास करें।"
                ),
                voice_advisory="किसान भाई, खेत में पर्याप्त नमी बनाए रखें और रोग से बचाव के लिए जैविक नीम के घोल का छिड़काव करें।",
                voice_commands=["नीम के अर्क का छिड़काव करें", "खेत में नमी की जांच करें"],
                action_intent="GENERAL_ADVISORY",
            )
        return AssistantStructuredResponse(
            detailed_advisory=(
                "Dear farmer, server traffic is currently high. For general crop protection, preventive application of 5% Neem Seed Kernel Extract (NSKE) "
                "or biological bio-fungicides is recommended. Ensure adequate soil moisture and balanced nutrient management."
            ),
            voice_advisory="Dear farmer, please maintain optimal soil moisture and inspect foliage for early symptoms before spraying.",
            voice_commands=["Check soil moisture", "Apply organic neem extract"],
            action_intent="GENERAL_ADVISORY",
        )

    async def generate_response(
        self,
        query_text: Optional[str] = None,
        image_bytes: Optional[bytes] = None,
        audio_bytes: Optional[bytes] = None,
        audio_mime_type: Optional[str] = "audio/mp3",
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        target_language: str = "hi",
    ) -> AssistantStructuredResponse:
        if not self.client:
            raise RuntimeError("Gemini API key is not configured. Set GEMINI_API_KEY in your environment.")

        # 1. Concurrently fetch weather with a 2.0s ceiling
        weather = None
        if latitude is not None and longitude is not None and get_current_weather:
            try:
                weather = await asyncio.wait_for(get_current_weather(latitude, longitude), timeout=2.0)
            except Exception as w_err:
                logger.warning(f"Weather lookup skipped: {w_err}")

        media_contents = []

        # 2. Preprocess image if provided
        if image_bytes:
            optimized_bytes = await asyncio.to_thread(self.preprocess_image, image_bytes)
            media_contents.append(
                types.Part.from_bytes(data=optimized_bytes, mime_type="image/jpeg")
            )

        # 3. Add audio bytes if provided
        if audio_bytes:
            media_contents.append(
                types.Part.from_bytes(data=audio_bytes, mime_type=audio_mime_type)
            )

        # 4. Build prompt
        prompt_sections = []
        if weather:
            prompt_sections.append(
                f"[REAL-TIME FIELD WEATHER at Lat: {latitude}, Lon: {longitude}]\n"
                f"- Temperature: {weather.get('temperature_c', 'N/A')}°C\n"
                f"- Relative Humidity: {weather.get('humidity_pct', 'N/A')}%\n"
                f"- Current Precipitation: {weather.get('current_precipitation_mm', 0)} mm\n"
                f"- Max Rain Probability (Next 12h): {weather.get('next_12h_rain_chance_pct', 0)}%\n"
            )

        if query_text:
            prompt_sections.append(f"Farmer Query: {query_text}")

        prompt_sections.append(
            f"MANDATORY: Return the structured JSON response in language code '{target_language or 'hi'}'. "
            f"Provide comprehensive detailed recommendations, crisp imperative commands, and a natural spoken script."
        )

        contents = [*media_contents, "\n\n".join(prompt_sections)]

        safety_settings = [
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold=types.HarmBlockThreshold.BLOCK_ONLY_HIGH,
            ),
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold=types.HarmBlockThreshold.BLOCK_ONLY_HIGH,
            ),
        ]

        # 5. Non-blocking model call with timeout
        for model_name in self.candidate_models:
            try:
                response = await asyncio.wait_for(
                    async_generate_content_with_backoff(
                        client=self.client,
                        model=model_name,
                        contents=contents,
                        config=types.GenerateContentConfig(
                            system_instruction=SYSTEM_INSTRUCTION,
                            response_mime_type="application/json",
                            response_schema=AssistantStructuredResponse,
                            temperature=0.25,
                            safety_settings=safety_settings,
                        ),
                        max_retries=1,
                        base_delay=1.0,
                    ),
                    timeout=10.0,
                )

                if response and response.text:
                    clean_text = response.text.strip()
                    if clean_text.startswith("```"):
                        clean_text = clean_text.split("```")[1]
                        if clean_text.startswith("json"):
                            clean_text = clean_text[4:].strip()

                    return AssistantStructuredResponse.model_validate_json(clean_text)

            except Exception as exc:
                logger.warning(f"Assistant candidate '{model_name}' skipped: {exc}")
                continue

        # Fallback if both models fail or timeout
        return self.get_fallback_advisory(target_language)


assistant_service = FarmerAssistantService()