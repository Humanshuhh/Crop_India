# backend/routers/soil.py
import asyncio
import logging
import random
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.schemas.soil_schemas import (
    SoilHealthInput,
    RegenerativeAdvisoryResponse,
    RegenerativeActionPlan,
    BioAmendment,
    CropRotationCycle,
)
from backend.ml_engine.soil_advisor import soil_advisor_engine
from backend.agronomy.rotation_engine import regenerative_engine

logger = logging.getLogger("cropindia.soil")

router = APIRouter(prefix="/api/v1/soil", tags=["Soil Health & Regenerative Agronomy"])

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


class SoilInputRequest(BaseModel):
    organic_carbon_pct: float = Field(0.42, description="Soil Organic Carbon percentage")
    ph: float = Field(6.8, description="Soil pH level")
    texture: str = Field("Sandy Clay Loam", description="Soil texture")
    current_crop: str = Field("Paddy (Rice)", description="Current or recent crop")
    target_language: str = Field("hi", description="Regional language code")
    zone: Optional[str] = Field("Eastern Plateau & Hills", description="Agro-climatic region")


@router.post("/evaluate", response_model=RegenerativeAdvisoryResponse)
async def evaluate_soil_health(payload: SoilHealthInput):
    """Telemetry soil evaluation endpoint with resilient retry handling."""
    max_retries = 3
    base_delay = 1.5

    for attempt in range(max_retries):
        try:
            advisory = await asyncio.to_thread(soil_advisor_engine.evaluate_and_advise, payload)
            return advisory
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))
        except RETRYABLE_EXCEPTIONS as exc:
            if attempt == max_retries - 1:
                logger.error(f"Soil evaluation quota exhausted: {exc}")
                raise HTTPException(
                    status_code=503,
                    detail="Soil health advisor is handling peak volume. Please retry shortly.",
                )
            sleep_time = (base_delay * (2 ** attempt)) + random.uniform(0.5, 1.2)
            logger.warning(f"Soil advisor throttled (Attempt {attempt + 1}). Retrying in {sleep_time:.2f}s...")
            await asyncio.sleep(sleep_time)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Advisory generation failed: {str(exc)}")


@router.post("/regenerative-plan", response_model=RegenerativeActionPlan)
async def create_regenerative_plan(payload: SoilInputRequest):
    """
    Generates a non-chemical action plan, replacement bio-amendments,
    and crop rotations with retries and an intelligent local fallback.
    """
    max_retries = 3
    base_delay = 1.5

    for attempt in range(max_retries):
        try:
            plan = await asyncio.to_thread(
                regenerative_engine.generate_plan,
                organic_carbon_pct=payload.organic_carbon_pct,
                ph=payload.ph,
                texture=payload.texture,
                current_crop=payload.current_crop,
                target_language=payload.target_language,
                zone=payload.zone or "Eastern Plateau & Hills",
            )
            return plan
        except RETRYABLE_EXCEPTIONS as exc:
            if attempt < max_retries - 1:
                sleep_time = (base_delay * (2 ** attempt)) + random.uniform(0.5, 1.0)
                await asyncio.sleep(sleep_time)
                continue
            logger.warning(f"Model capacity exceeded during plan generation: {exc}. Activating agronomic fallback.")
            break
        except Exception as exc:
            logger.warning(f"[Fallback Triggered] Regenerative plan encountered an error: {exc}")
            break

    # Resilient agronomic fallback
    soc_status = "Critically Deficient" if payload.organic_carbon_pct < 0.50 else "Moderate"
    return RegenerativeActionPlan(
        soil_health_assessment=f"Soil Organic Carbon is {payload.organic_carbon_pct}% ({soc_status}). Soil pH is {payload.ph}.",
        synthetic_chemical_alert="Zero synthetic chemicals recommended. Avoid Urea and DAP to rebuild soil biology.",
        biological_amendments=[
            BioAmendment(
                name="Fermented Jeevamrit Solution",
                target_deficiency="Depleted Organic Carbon and beneficial bacterial colony collapse",
                preparation_or_sourcing="Ferment indigenous cow dung, urine, jaggery, and pulse flour for 5-7 days.",
                dosage_and_application="200 liters per acre via irrigation or root drenching every 14 days.",
            ),
            BioAmendment(
                name="Trichoderma Enriched FYM",
                target_deficiency="Soil-borne pathogens and low fungal biomass",
                preparation_or_sourcing="Mix 2 kg Trichoderma into 100 kg moist farmyard manure under shade.",
                dosage_and_application="Broadcast 100 kg per acre before sowing or mulching.",
            ),
        ],
        regenerative_crop_rotations=[
            CropRotationCycle(
                season="Zaid (Summer)",
                recommended_crop="Dhaincha Green Manure",
                ecological_role="Fixes atmospheric nitrogen and restores organic humus",
                water_requirement="Low",
            ),
            CropRotationCycle(
                season="Kharif",
                recommended_crop="Pearl Millet (Bajra) intercropped with Pigeon Pea (Arhar)",
                ecological_role="Drought resilience and monoculture disruption",
                water_requirement="Low",
            ),
        ],
        cultural_water_practices=[
            "Broadcast dry crop residue mulch to preserve soil moisture.",
            "Adopt minimum tillage along contour lines.",
        ],
        spoken_summary="किसान भाई, आपकी मिट्टी में जैविक कार्बन कम है। यूरिया और डीएपी का उपयोग बंद करें। खेत में जीवामृत और ढैंचा की हरी खाद डालें तथा बाजरा और अरहर की मिश्रित खेती करें।",
    )