# backend/ml_engine/diagnostics.py

import io
import json
import logging
import os
from typing import List, Optional

from PIL import Image, ImageOps
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

# Import the centralized async backoff client wrapper
try:
    from backend.utils.gemini_client import async_generate_content_with_backoff
except ImportError:
    from gemini_client import async_generate_content_with_backoff

logger = logging.getLogger("cropindia.diagnostics")


class EcoRemedy(BaseModel):
    title: str = Field(description="Name of the natural or biological amendment/bio-pesticide")
    preparation: str = Field(description="Step-by-step preparation using locally available ingredients or bio-agents")
    application: str = Field(description="Exact dosage, dilution ratio, and spray timing/frequency")


class LeafDiagnosisResult(BaseModel):
    is_plant_detected: bool = Field(description="True if a crop leaf, foliage, or plant tissue is visible. False for non-plant or garbage images.")
    crop_name: Optional[str] = Field(default=None, description="Common name of the crop or plant identified, or null if no plant is detected")
    detected_condition: str = Field(description="Specific disease name, pest damage pattern, nutrient chlorosis, or 'INVALID_IMAGE'")
    confidence_level: str = Field(description="Confidence rating: HIGH, MEDIUM, or LOW")
    underlying_cause: str = Field(description="Pathogen etiology or explanation of why the image is not relevant")
    visual_symptoms: List[str] = Field(default_factory=list, description="Observed physical symptoms or empty if not a plant")
    eco_friendly_remedies: List[EcoRemedy] = Field(
        default_factory=list,
        description="Non-chemical, regenerative treatments (empty if not a plant)"
    )
    preventive_cultural_practices: List[str] = Field(
        default_factory=list,
        description="Agronomic field hygiene practices (empty if not a plant)"
    )
    spoken_summary: str = Field(
        description="Clear vernacular message. If not a plant, explain politely that the image is not a recognized plant leaf and ask to take a clear photo of the crop."
    )


def resolve_api_key() -> Optional[str]:
    return (
        os.getenv("GEMINI_API_KEY")
        or os.getenv("GOOGLE_API_KEY")
        or os.getenv("GOOGLE_GENAI_API_KEY")
    )


class PlantDiagnosticsEngine:
    def __init__(self):
        self.api_key = resolve_api_key()
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None
        
        # High-throughput candidate models with fast fallback
        self.candidate_models = [
            "gemini-3.5-flash-lite",
            "gemini-3.8-flash",
        ]

    async def async_diagnose_leaf_image(
        self,
        image_bytes: bytes,
        target_language: str = "hi",
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        agro_context: Optional[dict] = None,
        mime_type: str = "image/jpeg"
    ) -> LeafDiagnosisResult:
        """
        Asynchronously diagnoses leaf pathology using the resilient Gemini client wrapper.
        """
        if not self.client:
            raise RuntimeError("Gemini API key is not configured. Set GEMINI_API_KEY in your environment.")

        env_context_str = "No geospatial telemetry provided."
        if agro_context:
            z = agro_context.get("zone", "Semi-Arid / Tropical")
            oc = agro_context.get("organic_carbon", "0.45% (Low)")
            ph = agro_context.get("ph", "7.2")
            tx = agro_context.get("texture", "Sandy Loam")
            ndvi = agro_context.get("ndvi", 0.52)
            rf = agro_context.get("rainfall_mm", agro_context.get("current_precipitation_mm", "0 mm"))
            temp = agro_context.get("current_temperature_c", "N/A")
            humidity = agro_context.get("relative_humidity_pct", "N/A")
            rain_chance = agro_context.get("next_12h_rain_chance_pct", "N/A")

            env_context_str = (
                f"- GPS Location: Lat {latitude}, Lon {longitude}\n"
                f"- Agro-Climatic Zone: {z}\n"
                f"- Current Weather: Temp = {temp}°C, Relative Humidity = {humidity}%, Recent Rain = {rf}, Rain Chance (12h) = {rain_chance}%\n"
                f"- Soil Baseline: Organic Carbon = {oc}, pH = {ph}, Texture = {tx}\n"
                f"- Satellite Telemetry: Mean NDVI = {ndvi}"
            )
        elif latitude is not None and longitude is not None:
            env_context_str = f"- GPS Coordinates: Latitude {latitude}, Longitude {longitude}"

        prompt = (
            "You are an expert plant pathologist and regenerative agro-ecologist assisting Indian smallholder farmers.\n"
            f"The farmer's selected language code is: '{target_language}'.\n\n"
            "--- GEOSPATIAL & ENVIRONMENTAL TELEMETRY (FUSED CONTEXT) ---\n"
            f"{env_context_str}\n"
            "----------------------------------------------------------\n\n"
            "CRITICAL VALIDATION & DIAGNOSTIC GUIDELINES:\n"
            "1. IMAGE RELEVANCE CHECK (STRICT):\n"
            "   - First inspect if the image clearly contains a crop, plant, leaf, stem, or agricultural specimen.\n"
            "   - If the image contains a human, animal, vehicle, random object, blank wall, screenshot, or completely blurry/unrecognizable content:\n"
            "     * Set `is_plant_detected` to false.\n"
            "     * Set `crop_name` to null.\n"
            "     * Set `detected_condition` to 'INVALID_IMAGE'.\n"
            "     * Set `confidence_level` to 'LOW'.\n"
            "     * Set `underlying_cause` to 'The uploaded image does not contain a recognizable plant or crop leaf.'\n"
            "     * Set `visual_symptoms`, `eco_friendly_remedies`, and `preventive_cultural_practices` to empty lists [].\n"
            "     * In `spoken_summary`, write a polite message in the language of '{target_language}' asking the farmer to upload a clear picture of their crop.\n"
            "     * STOP HERE and return the response.\n\n"
            "2. IF A PLANT/LEAF IS DETECTED:\n"
            "   - Set `is_plant_detected` to true.\n"
            "   - Identify the crop species and primary condition.\n"
            "   - CROSS-REFERENCE WITH WEATHER & GEOSPATIAL CONTEXT:\n"
            "     * If chlorosis matches low Soil Organic Carbon or alkaline pH, diagnose nutrient deficiency.\n"
            "     * If fungal lesions match elevated humidity (>75%) or rainfall, state that environmental humidity triggered it.\n"
            "   - Strictly recommend non-chemical, regenerative bio-remedies (Neem oil, Trichoderma harzianum, sour buttermilk/chaach, Jeevamrit).\n"
            "   - Write `spoken_summary` in conversational '{target_language}' explaining the problem and immediate organic solution."
        )

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

        contents = [
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            prompt,
        ]

        config = types.GenerateContentConfig(
            temperature=0.1,
            response_mime_type="application/json",
            response_schema=LeafDiagnosisResult,
            safety_settings=safety_settings,
        )

        last_error = None

        # Iterate through high-throughput candidate models
        for model_name in self.candidate_models:
            try:
                response = await async_generate_content_with_backoff(
                    client=self.client,
                    model=model_name,
                    contents=contents,
                    config=config,
                    max_retries=2,
                    base_delay=1.0,
                )

                clean_text = response.text.strip()
                if clean_text.startswith("```"):
                    clean_text = clean_text.split("```")[1]
                    if clean_text.startswith("json"):
                        clean_text = clean_text[4:].strip()

                return LeafDiagnosisResult.model_validate_json(clean_text)

            except Exception as exc:
                last_error = exc
                logger.warning(f"Candidate model '{model_name}' failed: {exc}. Trying fallback...")
                continue

        raise RuntimeError(f"All diagnostic candidate models failed. Last error: {last_error}")


def preprocess_image(image_bytes: bytes, max_dim: int = 768, quality: int = 80) -> bytes:
    """
    Optimizes the image to 768px using BILINEAR resampling (3x faster than LANCZOS)
    and 80% JPEG quality. Fits precisely inside Gemini's single-tile token budget
    to drastically cut network transit and visual token inference latency.
    """
    with Image.open(io.BytesIO(image_bytes)) as img:
        img = ImageOps.exif_transpose(img)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        img.thumbnail((max_dim, max_dim), Image.Resampling.BILINEAR)
        output_buffer = io.BytesIO()
        img.save(output_buffer, format="JPEG", quality=quality, optimize=False)
        return output_buffer.getvalue()


plant_diagnostics_engine = PlantDiagnosticsEngine()