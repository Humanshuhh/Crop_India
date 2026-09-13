# backend/routers/early_warning.py

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

# Import  initialized Firestore client
# Adjust import path to match  project structure (e.g., from backend.database.firestore import db)
try:
    from backend.database import db
except ImportError:
    # Graceful fallback if database client is configured elsewhere
    db = None

router = APIRouter(prefix="/api/v1/early-warning", tags=["Predictive Early Warning"])


# --- Schemas ---

class TelemetrySnapshot(BaseModel):
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ndvi: float = Field(..., ge=-1.0, le=1.0, description="Vegetation vigor index")
    ndwi: float = Field(..., ge=-1.0, le=1.0, description="Canopy water index")
    temperature_c: float
    relative_humidity_pct: float
    rainfall_mm: float


class EarlyWarningEvaluationRequest(BaseModel):
    farmer_id: Optional[str] = "farmer_101"
    latitude: float
    longitude: float
    zone: Optional[str] = "Eastern Plateau & Hills"
    target_language: Optional[str] = "hi"
    baseline_ndvi: Optional[float] = 0.65
    telemetry_series: List[TelemetrySnapshot]


class EarlyWarningAdvisory(BaseModel):
    warning_id: str
    risk_level: str  # "LOW", "MODERATE", "HIGH", "CRITICAL"
    anomaly_detected: bool
    predicted_stress_type: Optional[str] = None
    confidence_score: float
    proactive_actions: List[str]
    spoken_advisory: str
    timestamp: datetime


# --- Detection Engine ---

def run_time_series_anomaly_check(
    history: List[TelemetrySnapshot], baseline_ndvi: float = 0.65
) -> Dict[str, Any]:
    """
    Evaluates rolling telemetry against agro-climatic baselines to flag pre-symptomatic stress.
    """
    if not history:
        raise ValueError("Telemetry series cannot be empty.")

    recent = history[-1]
    ndvi_drop = baseline_ndvi - recent.ndvi

    # Fungal pathogen risk: Elevated canopy moisture + high RH + declining vegetation index
    if recent.relative_humidity_pct > 80.0 and recent.ndwi > 0.4 and ndvi_drop > 0.15:
        return {
            "risk_level": "HIGH",
            "anomaly_detected": True,
            "predicted_stress_type": "Incipient Fungal Spore Proliferation (Pre-Symptomatic Blight)",
            "confidence_score": 0.88,
            "proactive_actions": [
                "Apply prophylactic spray of fermented sour buttermilk (Chaach) diluted 1:10 with water.",
                "Foliar spray of Pseudomonas fluorescens (20g/liter) during early morning hours.",
                "Inspect field bunds and drainage paths to avoid root zone water stagnation."
            ],
            "spoken_advisory": "किसान भाई, उपग्रह डेटा के अनुसार आपके खेत में नमी अधिक होने से फफूंद लगने का खतरा है। पत्तों पर लक्षण दिखने से पहले ही खट्टी छाछ या स्यूडोमोनास का छिड़काव करें।"
        }

    # Moisture stress / dehydration risk
    if recent.ndwi < 0.1 and recent.temperature_c > 35.0:
        return {
            "risk_level": "MODERATE",
            "anomaly_detected": True,
            "predicted_stress_type": "Soil Moisture Stress / Canopy Dehydration",
            "confidence_score": 0.82,
            "proactive_actions": [
                "Apply straw or crop residue mulch to preserve residual root moisture.",
                "Administer light evening irrigation; avoid daytime peak heat.",
                "Spray 2% diluted Jeevamrit to strengthen foliar drought resilience."
            ],
            "spoken_advisory": "किसान भाई, उपग्रह डेटा से पता चला है कि खेत की नमी तेजी से घट रही है। फसल को सूखने से बचाने के लिए पुआल की मल्चिंग करें और शाम को हल्की सिंचाई दें।"
        }

    # Baseline healthy status
    return {
        "risk_level": "LOW",
        "anomaly_detected": False,
        "predicted_stress_type": None,
        "confidence_score": 0.95,
        "proactive_actions": [
            "Crop vitality index is normal. Continue planned organic maintenance."
        ],
        "spoken_advisory": "फसल का स्वास्थ्य सामान्य है। कोई पूर्व चेतावनी आवश्यक नहीं है।"
    }


# --- Endpoints ---

@router.post("/evaluate-risk", response_model=EarlyWarningAdvisory, status_code=status.HTTP_200_OK)
async def evaluate_crop_risk(payload: EarlyWarningEvaluationRequest):
    """
    Analyzes satellite telemetry time-series to detect pre-symptomatic crop stress.
    Automatically persists alerts into the early_warnings Firestore collection.
    """
    try:
        analysis = run_time_series_anomaly_check(
            history=payload.telemetry_series,
            baseline_ndvi=payload.baseline_ndvi
        )

        warning_id = f"warn_{uuid.uuid4().hex[:10]}"
        now = datetime.now(timezone.utc)

        advisory_record = EarlyWarningAdvisory(
            warning_id=warning_id,
            risk_level=analysis["risk_level"],
            anomaly_detected=analysis["anomaly_detected"],
            predicted_stress_type=analysis["predicted_stress_type"],
            confidence_score=analysis["confidence_score"],
            proactive_actions=analysis["proactive_actions"],
            spoken_advisory=analysis["spoken_advisory"],
            timestamp=now
        )

        # Persist alert to Firestore if anomaly detected and DB is accessible
        if db is not None and analysis["anomaly_detected"]:
            doc_data = {
                "warning_id": warning_id,
                "farmer_id": payload.farmer_id,
                "latitude": payload.latitude,
                "longitude": payload.longitude,
                "zone": payload.zone,
                "analysis": advisory_record.model_dump(),
                "created_at": now.isoformat()
            }
            db.collection("early_warnings").document(warning_id).set(doc_data)

        return advisory_record

    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(exc)}")