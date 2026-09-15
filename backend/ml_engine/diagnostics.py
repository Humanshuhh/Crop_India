import json
import logging
import os
from typing import List, Optional
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

logger = logging.getLogger("kisan_sahayak.diagnostics")


class EcoRemedy(BaseModel):
    title: str = Field(description="Name of the natural or biological amendment/bio-pesticide")
    preparation: str = Field(description="Step-by-step preparation using locally available ingredients or bio-agents")
    application: str = Field(description="Exact dosage, dilution ratio, and spray timing/frequency")


class LeafDiagnosisResult(BaseModel):
    is_plant_detected: bool = Field(description="True if a crop leaf, foliage, or plant tissue is visible")
    crop_name: Optional[str] = Field(default=None, description="Common name of the crop or plant identified")
    detected_condition: str = Field(description="Specific disease name, pest damage pattern, or nutrient chlorosis")
    confidence_level: str = Field(description="Confidence rating: HIGH, MEDIUM, or LOW")
    underlying_cause: str = Field(description="Pathogen etiology, environmental predisposition, or soil nutrient imbalance")
    visual_symptoms: List[str] = Field(default_factory=list, description="Observed physical symptoms")
    eco_friendly_remedies: List[EcoRemedy] = Field(
        default_factory=list,
        description="Non-chemical, regenerative, or bio-fungicide treatments"
    )
    preventive_cultural_practices: List[str] = Field(
        default_factory=list,
        description="Agronomic field hygiene, crop rotation, and watering practices"
    )
    spoken_summary: str = Field(
        description="Concise spoken advisory in plain language suitable for direct TTS voice playback"
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
        self.candidate_models = ["gemini-3.6-flash","gemini-3.7-flash"]

    def diagnose_leaf_image(
        self,
        image_bytes: bytes,
        target_language: str = "hi",
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        agro_context: Optional[dict] = None,
        mime_type: str = "image/jpeg"
    ) -> LeafDiagnosisResult:
        if not self.client:
            raise RuntimeError("Gemini API key is not configured. Set GEMINI_API_KEY in your environment.")

        env_context_str = "No geospatial telemetry provided."
        if agro_context:
            z = agro_context.get("zone", "Semi-Arid / Tropical")
            oc = agro_context.get("organic_carbon", "0.45% (Low)")
            ph = agro_context.get("ph", "7.2")
            tx = agro_context.get("texture", "Sandy Loam")
            ndvi = agro_context.get("ndvi", 0.52)
            rf = agro_context.get("rainfall_mm", "45mm")
            ndwi = agro_context.get("ndwi", "Moderate")

            env_context_str = (
                f"- GPS Location: Lat {latitude}, Lon {longitude}\n"
                f"- Agro-Climatic Zone: {z}\n"
                f"- Soil Baseline: Organic Carbon = {oc}, pH = {ph}, Texture = {tx}\n"
                f"- Satellite Telemetry: Mean NDVI = {ndvi}, Recent 14-day Rainfall = {rf}, NDWI = {ndwi}"
            )
        elif latitude is not None and longitude is not None:
            env_context_str = f"- GPS Coordinates: Latitude {latitude}, Longitude {longitude}"

        prompt = (
            "You are an expert plant pathologist and regenerative agro-ecologist assisting Indian smallholder farmers.\n"
            f"The farmer's selected language code is: '{target_language}'.\n\n"
            "--- GEOSPATIAL & ENVIRONMENTAL TELEMETRY (FUSED CONTEXT) ---\n"
            f"{env_context_str}\n"
            "----------------------------------------------------------\n\n"
            "Diagnostic Guidelines:\n"
            "1. Confirm if a plant or crop leaf is present. If not, set is_plant_detected to false.\n"
            "2. Identify the crop species and primary condition.\n"
            "3. CROSS-REFERENCE WITH GEOSPATIAL CONTEXT:\n"
            "   - If chlorosis matches low Soil Organic Carbon or alkaline pH, diagnose nutrient deficiency.\n"
            "   - If fungal lesions match elevated rainfall/canopy moisture, explain that environmental humidity triggered it.\n"
            "4. STRICTLY RECOMMEND BIOLOGICAL & REGENERATIVE REMEDIES:\n"
            "   - Recommend non-chemical solutions (Neem Seed Kernel Extract, Trichoderma harzianum, fermented sour buttermilk).\n"
            "   - DO NOT recommend toxic synthetic chemical fungicides or pesticides.\n"
            "5. SPOKEN VOICE SCRIPT:\n"
            f"   - Write 'spoken_summary' entirely in the language of '{target_language}' (e.g. conversational Hindi, Telugu, Bengali).\n"
            "   - Keep it reassuring, jargon-free, and natural for low-literacy voice playback."
        )

        last_error = None
        for model_name in self.candidate_models:
            try:
                response = self.client.models.generate_content(
                    model=model_name,
                    contents=[
                        types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                        prompt,
                    ],
                    config=types.GenerateContentConfig(
                        temperature=0.2,
                        response_mime_type="application/json",
                        response_schema=LeafDiagnosisResult,
                        tools=[],
                    ),
                )
                return LeafDiagnosisResult(**json.loads(response.text.strip()))
            except Exception as exc:
                last_error = exc
                logger.warning(f"Diagnosis failed using {model_name}: {exc}")
                continue

        raise RuntimeError(f"All diagnostic candidate models failed. Last error: {last_error}")

import io
from PIL import Image, ImageOps

def preprocess_image(image_bytes: bytes, max_dim: int = 1024, quality: int = 85) -> bytes:
    """
    Resizes the image to a maximum dimension of max_dim x max_dim (preserving aspect ratio)
    and compresses it as JPEG to minimize API latency and token cost.
    """
    with Image.open(io.BytesIO(image_bytes)) as img:
        # Automatically rotate based on EXIF metadata if present
        img = ImageOps.exif_transpose(img)

        # Convert palette/transparency to RGB for JPEG compression
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        # Resize while maintaining aspect ratio
        img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

        # Compress to JPEG
        output_buffer = io.BytesIO()
        img.save(output_buffer, format="JPEG", quality=quality, optimize=True)
        return output_buffer.getvalue()
# Crucial: instantiate engine for imports
plant_diagnostics_engine = PlantDiagnosticsEngine()