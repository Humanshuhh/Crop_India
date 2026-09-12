from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from backend.ml_engine.diagnostics import plant_diagnostics_engine, preprocess_image

router = APIRouter(prefix="/api/v1", tags=["Plant Diagnostics"])

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

    try:
        diagnosis = plant_diagnostics_engine.diagnose_leaf_image(
            image_bytes=optimized_bytes,
            target_language=target_language,
            latitude=latitude,
            longitude=longitude,
            agro_context=agro_context,
            mime_type="image/jpeg",
        )
        return diagnosis
    except Exception as exc:
        # Fallback handling...
        raise HTTPException(status_code=500, detail=str(exc))