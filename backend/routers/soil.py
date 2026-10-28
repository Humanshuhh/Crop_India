# backend/routers/soil.py

import logging
from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel, Field

from backend.database.firestore_crud import save_soil_record
from backend.ml_engine.soil_advisor import soil_advisor_engine

logger = logging.getLogger("cropindia.soil")
router = APIRouter(prefix="/api/v1/soil", tags=["Soil Health & Regenerative Agronomy"])


class SoilHealthInput(BaseModel):
    farmer_id: Optional[str] = Field("default_farmer", description="Farmer ID")
    latitude: float = Field(23.66, description="Latitude of the field")
    longitude: float = Field(86.42, description="Longitude of the field")
    ph: Optional[float] = Field(None, description="Soil pH level (1-14)")
    organic_carbon_percent: Optional[float] = Field(None, description="Soil Organic Carbon % (SOC)")
    nitrogen_kg_ha: Optional[float] = Field(None, description="Available Nitrogen in kg/ha")
    phosphorus_kg_ha: Optional[float] = Field(None, description="Available Phosphorus in kg/ha")
    potassium_kg_ha: Optional[float] = Field(None, description="Available Potassium in kg/ha")
    zinc_ppm: Optional[float] = Field(None, description="Available Zinc in ppm")
    target_language: str = Field("en", description="Target language code (e.g., 'en', 'hi', 'mr')")


class BioAmendment(BaseModel):
    name: str
    target_deficiency: str
    preparation_or_sourcing: str
    dosage_and_application: str


class CropRotationCycle(BaseModel):
    season: str
    recommended_crop: str
    ecological_role: str
    water_requirement: str


class RegenerativeReportResponse(BaseModel):
    soil_health_assessment: str
    synthetic_chemical_alert: Optional[str] = None
    biological_amendments: List[BioAmendment]
    regenerative_crop_rotations: List[CropRotationCycle]
    cultural_water_practices: List[str]
    spoken_summary: str


def _persist_soil_record_safe(farmer_id: str, payload: SoilHealthInput, plan: Any):
    """Background worker task to persist soil evaluation without blocking the HTTP response."""
    try:
        save_soil_record(
            farmer_id=farmer_id or "default_farmer",
            record_id=None,
            soil_input=payload,
            plan=plan,
        )
    except Exception as exc:
        logger.warning(f"Background soil record persistence skipped: {exc}")


@router.post("/evaluate", response_model=RegenerativeReportResponse)
async def evaluate_soil_health(payload: SoilHealthInput, background_tasks: BackgroundTasks):
    """
    Evaluates soil parameters using non-blocking Gemini inference with instant rule-based fallback,
    and asynchronously persists the result to Firestore History.
    """
    # 1. Non-blocking inference with 10s ceiling and built-in ICAR fallback
    advisory_result = await soil_advisor_engine.async_evaluate_and_advise(payload)

    # 2. Convert to router response contract
    report = RegenerativeReportResponse(
        soil_health_assessment=advisory_result.soil_health_assessment,
        synthetic_chemical_alert=advisory_result.synthetic_chemical_alert,
        biological_amendments=[
            BioAmendment(
                name=b.name,
                target_deficiency=b.target_deficiency,
                preparation_or_sourcing=b.preparation_or_sourcing,
                dosage_and_application=b.dosage_and_application,
            )
            for b in advisory_result.biological_amendments
        ],
        regenerative_crop_rotations=[
            CropRotationCycle(
                season=r.season,
                recommended_crop=r.recommended_crop,
                ecological_role=r.ecological_role,
                water_requirement=r.water_requirement,
            )
            for r in advisory_result.regenerative_crop_rotations
        ],
        cultural_water_practices=advisory_result.cultural_water_practices,
        spoken_summary=advisory_result.spoken_summary,
    )

    # 3. Offload Firestore I/O to background task (zero latency added)
    background_tasks.add_task(
        _persist_soil_record_safe,
        farmer_id=payload.farmer_id or "default_farmer",
        payload=payload,
        plan=report,
    )

    return report