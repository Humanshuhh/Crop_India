# backend/routers/diagnostics.py
import asyncio
import logging
import random
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from backend.ml_engine.diagnostics import plant_diagnostics_engine, preprocess_image

logger = logging.getLogger("cropindia.diagnostics")
router = APIRouter(prefix="/api/v1", tags=["Plant Diagnostics"])

RETRYABLE_EXCEPTIONS: tuple = ()
try:
    from google.genai.errors import APIError
    RETRYABLE_EXCEPTIONS += (APIError,)
except ImportError:
    pass

try:
    from google.api_core.exceptions import InternalServerError, ResourceExhausted, ServiceUnavailable
    RETRYABLE_EXCEPTIONS += (ResourceExhausted, ServiceUnavailable, InternalServerError)
except ImportError:
    pass


@router.post("/diagnose")
async def diagnose_crop_leaf(
    file: UploadFile = File(...),
    latitude: float = Form(default=None),
    longitude: float = Form(default=None),
    target_language: str = Form(default="hi"),
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    raw_bytes = await file.read()

    # Optimize resolution and compress before multimodal inference
    try:
        optimized_bytes = preprocess_image(raw_bytes, max_dim=1024, quality=85)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to process image: {str(exc)}")

    agro_context = None
    if latitude is not None and longitude is not None:
        agro_context = {
            "zone": "Trans-Gangetic Plains / Eastern Plateau agro-climatic corridor",
            "organic_carbon": "0.42% (Critically Deficient)",
            "ph": 6.8,
            "texture": "Sandy Clay Loam",
            "ndvi": 0.48,
            "rainfall_mm": "52mm (Recent humid precipitation)",
            "ndwi": "Elevated canopy moisture",
        }

    # Execute diagnosis with non-blocking thread execution and exponential backoff
    max_retries = 4
    base_delay = 2.0

    for attempt in range(max_retries):
        try:
            diagnosis = await asyncio.to_thread(
                plant_diagnostics_engine.diagnose_leaf_image,
                image_bytes=optimized_bytes,
                target_language=target_language,
                latitude=latitude,
                longitude=longitude,
                agro_context=agro_context,
                mime_type="image/jpeg",
            )
            return diagnosis

        except RETRYABLE_EXCEPTIONS as exc:
            status_code = getattr(exc, "code", getattr(exc, "status_code", None))
            msg = str(exc).lower()

            is_transient = (
                status_code in (429, 500, 503)
                or "429" in msg
                or "resource_exhausted" in msg
                or "503" in msg
                or "overloaded" in msg
            )

            if not is_transient or attempt == max_retries - 1:
                logger.error(f"Plant diagnosis permanently failed on attempt {attempt + 1}: {exc}")
                raise HTTPException(
                    status_code=503,
                    detail="Plant diagnostic service is currently at peak capacity. Please retry in a moment.",
                )

            delay = (base_delay * (2 ** attempt)) + random.uniform(0.5, 1.5)
            logger.warning(
                f"Rate limit hit in plant diagnostics (Attempt {attempt + 1}/{max_retries}). "
                f"Retrying in {delay:.2f}s..."
            )
            await asyncio.sleep(delay)

        except Exception as exc:
            logger.error(f"Unexpected diagnostic failure: {exc}")
            raise HTTPException(status_code=500, detail=str(exc))