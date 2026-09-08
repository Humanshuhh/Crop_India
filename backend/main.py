import os
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

from backend.schemas.soil_schemas import SoilHealthInput, RegenerativeAdvisoryResponse
from backend.schemas.diagnosis_schemas import CropDiagnosisResponse
from backend.ml_engine.soil_advisor import soil_advisor_engine
from backend.ml_engine.diagnostics import plant_diagnostics_engine

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


@app.post("/api/v1/diagnose", response_model=CropDiagnosisResponse)
async def diagnose_crop_leaf(file: UploadFile = File(...)):
    """
    Accepts an uploaded crop leaf photograph, performs multimodal pathology
    diagnosis using Gemini, and returns eco-friendly organic remedies.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a valid image.")
    try:
        image_bytes = await file.read()
        diagnosis = plant_diagnostics_engine.diagnose_leaf_image(image_bytes)
        return diagnosis
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Leaf diagnosis failed: {str(exc)}")
