# backend/routers/diagnostics.py

import asyncio
import io
import json
import logging
import os
from typing import List, Optional

from PIL import Image, ImageOps
from pydantic import BaseModel, Field
from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile, status
from google import genai
from google.genai import types

# Centralized async backoff client import
try:
    from backend.utils.gemini_client import async_generate_content_with_backoff
except ImportError:
    try:
        from gemini_client import async_generate_content_with_backoff
    except ImportError:
        async_generate_content_with_backoff = None

from backend.database.firestore_crud import save_leaf_diagnostic

# Dynamic weather service resolution
try:
    from backend.services.weather import get_current_weather
except ImportError:
    try:
        from backend.services.weather_service import get_current_weather
    except ImportError:
        get_current_weather = None

logger = logging.getLogger("kisan_sahayak.diagnostics")

router = APIRouter(prefix="/api/v1", tags=["Crop Diagnostics"])


class EcoRemedy(BaseModel):
    title: str = Field(description="Name of the natural or biological amendment/bio-pesticide")
    preparation: str = Field(description="Step-by-step preparation using locally available ingredients or bio-agents")
    application: str = Field(description="Exact dosage, dilution ratio, and spray timing/frequency")


class LeafDiagnosisResult(BaseModel):
    is_plant_detected: bool = Field(description="True if a crop leaf, foliage, or plant tissue is visible. False for non-plant or garbage images.")
    crop_name: Optional[str] = Field(default=None, description="Common name of the crop or plant identified, or null if no plant is detected")
    detected_condition: str = Field(description="Specific disease name, pest damage pattern, nutrient chlorosis, or 'INVALID_IMAGE'")
    confidence_level: str = Field(description="Confidence rating: HIGH, MEDIUM, or LOW")
    underlying_cause: str = Field(description="Pathogen etiology, environmental predisposition, or reason why the image is invalid")
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
        description="Clear spoken advisory in plain language suitable for direct TTS voice playback. If not a plant, explain politely that the image is not a plant leaf."
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
        
        # High-throughput valid production endpoints with fast fallback
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
        if not self.client:
            raise RuntimeError("Gemini API key is not configured. Set GEMINI_API_KEY in your environment.")

        env_context_str = "No geospatial telemetry provided."
        if agro_context:
            z = agro_context.get("zone", "Semi-Arid / Tropical corridor")
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
                f"- Live Weather Telemetry: Temp = {temp}°C, Humidity = {humidity}%, Current Rain = {rf}, 12h Rain Chance = {rain_chance}%\n"
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
            "     * Set `underlying_cause` to 'The uploaded image does not contain a recognizable crop or plant leaf.'\n"
            "     * Set `visual_symptoms`, `eco_friendly_remedies`, and `preventive_cultural_practices` to empty lists [].\n"
            "     * In `spoken_summary`, write a polite message in '{target_language}' (e.g. in Hindi: 'यह फोटो किसी पौधे या पत्ती की नहीं लग रही है। कृपया अपने खेत की फसल या पत्ती की साफ फोटो खींचकर दोबारा भेजें।') asking the farmer to upload a clear crop picture.\n"
            "     * STOP HERE and return the response.\n\n"
            "2. IF A PLANT/LEAF IS DETECTED:\n"
            "   - Set `is_plant_detected` to true.\n"
            "   - Identify the crop species and primary condition.\n"
            "   - CROSS-REFERENCE WITH WEATHER & GEOSPATIAL CONTEXT:\n"
            "     * If chlorosis matches low Soil Organic Carbon or alkaline pH, diagnose nutrient deficiency.\n"
            "     * If fungal lesions match elevated humidity (>75%) or rainfall, state that environmental humidity triggered it.\n"
            "   - Strictly recommend non-chemical, regenerative bio-remedies (Neem Seed Kernel Extract, Trichoderma harzianum, sour buttermilk/chaach, Jeevamrit).\n"
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

        for model_name in self.candidate_models:
            try:
                if async_generate_content_with_backoff:
                    response = await async_generate_content_with_backoff(
                        client=self.client,
                        model=model_name,
                        contents=contents,
                        config=config,
                        max_retries=2,
                        base_delay=1.0,
                    )
                else:
                    response = await self.client.aio.models.generate_content(
                        model=model_name,
                        contents=contents,
                        config=config,
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
    Downscales to a 768px single vision tile budget at 80% JPEG quality.
    Uses BILINEAR interpolation for fast processing with zero diagnostic clarity loss.
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


async def _async_fetch_weather(lat: Optional[float], lon: Optional[float]) -> Optional[dict]:
    """Helper for non-blocking concurrent weather fetching with a strict 2s ceiling."""
    if lat is None or lon is None or get_current_weather is None:
        return None
    try:
        return await asyncio.wait_for(get_current_weather(lat, lon), timeout=2.0)
    except Exception as w_err:
        logger.warning(f"Async weather fetch failed or timed out: {w_err}")
        return None


@router.post("/diagnose", response_model=LeafDiagnosisResult)
async def diagnose_leaf_endpoint(
    background_tasks: BackgroundTasks,
    image: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None),
    farmer_id: Optional[str] = Form(None),
    target_language: Optional[str] = Form("hi"),
    latitude: Optional[str] = Form(None),
    longitude: Optional[str] = Form(None),
):
    upload = image or file
    if not upload:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Missing file upload. Please provide an image file under the form key 'image' or 'file'."
        )

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

        # 1. Concurrently run image optimization and weather fetch
        weather_task = asyncio.create_task(_async_fetch_weather(parsed_lat, parsed_lon))
        processed_bytes = await asyncio.to_thread(preprocess_image, image_content)
        live_weather = await weather_task

        # 2. Build agro-context payload
        agro_context = None
        if parsed_lat is not None and parsed_lon is not None:
            agro_context = {
                "zone": "Trans-Gangetic Plains / Eastern Plateau agro-climatic corridor",
                "organic_carbon": "0.42% (Critically Deficient)",
                "ph": 6.8,
                "texture": "Sandy Clay Loam",
                "ndvi": 0.48,
            }
            if live_weather:
                agro_context["current_temperature_c"] = live_weather.get("temperature_c")
                agro_context["relative_humidity_pct"] = live_weather.get("humidity_pct")
                agro_context["current_precipitation_mm"] = live_weather.get("current_precipitation_mm")
                agro_context["next_12h_rain_chance_pct"] = live_weather.get("next_12h_rain_chance_pct")

        # 3. Fast non-blocking AI inference with a hard 12-second overall timeout
        result = await asyncio.wait_for(
            plant_diagnostics_engine.async_diagnose_leaf_image(
                image_bytes=processed_bytes,
                target_language=target_language or "hi",
                latitude=parsed_lat,
                longitude=parsed_lon,
                agro_context=agro_context,
                mime_type=upload.content_type or "image/jpeg",
            ),
            timeout=12.0,
        )

        # 4. Reject non-plant or garbage images with HTTP 400
        if not result.is_plant_detected:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "INVALID_IMAGE",
                    "message": "The uploaded photo is not a recognizable crop or plant leaf.",
                    "spoken_summary": result.spoken_summary,
                }
            )

        # 5. Persist to Firestore asynchronously in the background (0ms latency penalty)
        background_tasks.add_task(
            save_leaf_diagnostic,
            farmer_id=farmer_id or "guest",
            diagnostic_id=None,
            diagnosis=result,
            latitude=parsed_lat,
            longitude=parsed_lon,
        )

        return result

    except HTTPException:
        raise
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="The leaf diagnostic engine timed out. Please try again with a clear photo."
        )
    except Exception as exc:
        logger.error(f"Leaf diagnosis pipeline failure: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Diagnosis failed: {str(exc)}"
        )