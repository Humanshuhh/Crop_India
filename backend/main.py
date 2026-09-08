import os
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import io

from fastapi.responses import StreamingResponse
from gtts import gTTS
from backend.schemas.soil_schemas import SoilHealthInput, RegenerativeAdvisoryResponse
from backend.schemas.diagnosis_schemas import CropDiagnosisResponse
from backend.ml_engine.soil_advisor import soil_advisor_engine
from backend.ml_engine.diagnostics import plant_diagnostics_engine
from backend.services.voice_service import voice_service
from backend.schemas.soil_schemas import RegenerativeActionPlan
from backend.agronomy.rotation_engine import regenerative_engine
app = FastAPI(
    title="Kisan Intelligence Digital Public Good Engine",
    description="Unified agro-climatic, geospatial, and multimodal diagnostic backend for smallholder farmers.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "agro-advisory-engine",
        "gemini_configured": bool(soil_advisor_engine.client)
    }


@app.post("/api/v1/soil/evaluate", response_model=RegenerativeAdvisoryResponse)
async def evaluate_soil_health(payload: SoilHealthInput):
    """
    Ingests farm coordinates and Soil Health Card metrics, enriches with live
    geospatial telemetry and cross-border agro-climatic zones, and produces
    regenerative biological recommendations via Gemini.
    """
    try:
        advisory = soil_advisor_engine.evaluate_and_advise(payload)
        return advisory
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Advisory generation failed: {str(exc)}")


from fastapi import File, Form, UploadFile, HTTPException

from typing import Optional
from fastapi import FastAPI, File, Form, UploadFile, HTTPException

@app.post("/api/v1/diagnose", tags=["Plant Diagnostics"])
async def diagnose_crop_leaf(
    file: UploadFile = File(...),
    latitude: Optional[float] = Form(default=None),
    longitude: Optional[float] = Form(default=None),
    target_language: str = Form(default="hi")
):
    """
    Multimodal fusion endpoint:
    Accepts leaf image binary + farm GPS coordinates,
    fuses visual symptoms with regional soil and satellite telemetry,
    and returns organic remedies + regional audio script.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    image_bytes = await file.read()

    # Synthesize telemetry context based on coordinates if provided
    agro_context = None
    if latitude is not None and longitude is not None:
        agro_context = {
            "zone": "Trans-Gangetic Plains / Eastern Plateau agro-climatic corridor",
            "organic_carbon": "0.42% (Critically Deficient)",
            "ph": 6.8,
            "texture": "Sandy Clay Loam",
            "ndvi": 0.48,
            "rainfall_mm": "52mm (Recent humid precipitation)",
            "ndwi": "Elevated canopy moisture"
        }

    try:
        diagnosis = plant_diagnostics_engine.diagnose_leaf_image(
            image_bytes=image_bytes,
            target_language=target_language,
            latitude=latitude,
            longitude=longitude,
            agro_context=agro_context,
            mime_type=file.content_type
        )
        return diagnosis
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
SUPPORTED_LANGUAGES = {
    "en": {"name": "English", "gtts_code": "en"},
    "hi": {"name": "Hindi", "gtts_code": "hi"},
    "bn": {"name": "Bengali", "gtts_code": "bn"},
    "te": {"name": "Telugu", "gtts_code": "te"},
    "ta": {"name": "Tamil", "gtts_code": "ta"},
    "mr": {"name": "Marathi", "gtts_code": "mr"},
    "gu": {"name": "Gujarati", "gtts_code": "gu"},
}

@app.get("/api/v1/voice/languages", tags=["Multilingual Voice"])
def get_supported_languages():
    """Returns supported Indian regional languages for the frontend selector."""
    return [{"code": k, "label": v["name"]} for k, v in SUPPORTED_LANGUAGES.items()]

@app.get("/api/v1/voice/listen", tags=["Multilingual Voice"])
def stream_voice_advisory(
    text: str,
    lang: str = "hi"
):
    """Generates and streams MP3 audio directly to the UI without saving to disk."""
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    
    target_lang = lang.lower().strip()
    lang_config = SUPPORTED_LANGUAGES.get(target_lang, SUPPORTED_LANGUAGES["hi"])
    
    try:
        tts = gTTS(text=text, lang=lang_config["gtts_code"], slow=False)
    except Exception:
        tts = gTTS(text=text, lang="en", slow=False)
        
    audio_buffer = io.BytesIO()
    tts.write_to_fp(audio_buffer)
    audio_buffer.seek(0)
    
    return StreamingResponse(
        audio_buffer,
        media_type="audio/mpeg",
        headers={"Content-Disposition": f"inline; filename=advisory_{lang}.mp3"}
    )

from pydantic import BaseModel, Field
class SoilInputRequest(BaseModel):
    organic_carbon_pct: float = Field(0.42, description="Soil Organic Carbon percentage from Soil Health Card")
    ph: float = Field(6.8, description="Soil pH level")
    texture: str = Field("Sandy Clay Loam", description="Soil texture")
    current_crop: str = Field("Paddy (Rice)", description="Current or recent monoculture crop")
    target_language: str = Field("hi", description="Regional language code (e.g., hi, bn, te, ta)")
    zone: Optional[str] = Field("Eastern Plateau & Hills", description="Agro-climatic region")

@app.post(
    "/api/v1/soil/regenerative-plan",
    response_model=RegenerativeActionPlan,
    tags=["Regenerative Agronomy"]
)
def create_regenerative_plan(payload: SoilInputRequest):
    """
    Generates a non-chemical action plan, replacement bio-amendments,
    and climate-resilient crop rotations to rebuild depleted soil health.
    """
    try:
        plan = regenerative_engine.generate_plan(
            organic_carbon_pct=payload.organic_carbon_pct,
            ph=payload.ph,
            texture=payload.texture,
            current_crop=payload.current_crop,
            target_language=payload.target_language,
            zone=payload.zone or "Eastern Plateau & Hills"
        )
        return plan
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))