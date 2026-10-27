# backend/routers/diagnostics.py

import io
import json
import logging
import os
import time
from typing import List, Optional
from PIL import Image, ImageOps
from pydantic import BaseModel, Field
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from google import genai
from google.genai import types

from backend.database.firestore_crud import save_leaf_diagnostic

logger = logging.getLogger("kisan_sahayak.diagnostics")

# Exposes single unified route prefix: /api/v1
router = APIRouter(prefix="/api/v1", tags=["Crop Diagnostics"])


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
        # Candidate model tiers with automatic fallback
        self.candidate_models = [
            "gemini-3.8-flash",
            "gemini-3.7-flash",
            "gemini-3.6-flash",
        ]

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
        max_attempts_per_model = 3  # Retry each candidate up to 3 times

        for model_name in self.candidate_models:
            for attempt in range(1, max_attempts_per_model + 1):
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
                    err_msg = str(exc).lower()

                    is_transient = (
                        "503" in err_msg
                        or "429" in err_msg
                        or "unavailable" in err_msg
                        or "high demand" in err_msg
                        or "resource_exhausted" in err_msg
                        or "overloaded" in err_msg
                        or "deadline_exceeded" in err_msg
                    )

                    if is_transient and attempt < max_attempts_per_model:
                        wait_seconds = 2 * attempt  # Backoff: 2s, 4s
                        logger.warning(
                            f"Model '{model_name}' hit demand/capacity limit (Attempt {attempt}/{max_attempts_per_model}). "
                            f"Retrying in {wait_seconds}s..."
                        )
                        time.sleep(wait_seconds)
                        continue

                    logger.warning(f"Candidate '{model_name}' failed on attempt {attempt}: {exc}")
                    break  # Failover to the next candidate model tier

        raise RuntimeError(f"All diagnostic candidate models failed after retries. Last error: {last_error}")


def preprocess_image(image_bytes: bytes, max_dim: int = 1024, quality: int = 85) -> bytes:
    """
    Resizes image to max_dim x max_dim and compresses to JPEG to minimize token overhead and latency.
    """
    with Image.open(io.BytesIO(image_bytes)) as img:
        img = ImageOps.exif_transpose(img)

        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

        output_buffer = io.BytesIO()
        img.save(output_buffer, format="JPEG", quality=quality, optimize=True)
        return output_buffer.getvalue()


plant_diagnostics_engine = PlantDiagnosticsEngine()


# Single endpoint definition: POST /api/v1/diagnose
@router.post("/diagnose", response_model=LeafDiagnosisResult)
async def diagnose_leaf_endpoint(
    image: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None),
    farmer_id: Optional[str] = Form(None),
    target_language: Optional[str] = Form("hi"),
    latitude: Optional[str] = Form(None),
    longitude: Optional[str] = Form(None),
):
    """
    Single diagnostic endpoint accepting multipart/form-data.
    Accepts the file upload under either 'image' or 'file' keys.
    Coerces coordinate inputs safely to prevent 422 errors and persists outputs to Firestore history.
    """
    upload = image or file
    if not upload:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Missing file upload. Please provide an image file under the form key 'image' or 'file'."
        )

    # Convert coordinates safely from strings to float, handling empty strings and NaN
    parsed_lat: Optional[float] = None
    parsed_lon: Optional[float] = None

    if latitude and latitude.strip() and latitude.lower() != "nan":
        try:
            parsed_lat = float(latitude.strip())
        except ValueError:
            parsed_lat = None

    if longitude and longitude.strip() and longitude.lower() != "nan":
        try:
            parsed_lon = float(longitude.strip())
        except ValueError:
            parsed_lon = None

    try:
        image_content = await upload.read()
        if not image_content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded image file is empty."
            )

        processed_bytes = preprocess_image(image_content)

        # 1. Execute AI Vision inference with 3-attempt backoff
        result = plant_diagnostics_engine.diagnose_leaf_image(
            image_bytes=processed_bytes,
            target_language=target_language or "hi",
            latitude=parsed_lat,
            longitude=parsed_lon,
            mime_type=upload.content_type or "image/jpeg",
        )

        # 2. Persist diagnosis directly into Firestore history
        save_leaf_diagnostic(
            farmer_id=farmer_id or "guest",
            diagnostic_id=None,
            diagnosis=result,
            latitude=parsed_lat,
            longitude=parsed_lon,
        )

        return result

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Leaf diagnosis pipeline failure: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Diagnosis failed: {str(exc)}"
        )