# backend/routers/early_warning.py

from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Any
from datetime import datetime, timezone
import uuid

# 1. Clean Schema Imports (Moved out of the router!)
from backend.schemas.warning_schemas import (
    TelemetrySnapshot,
    EarlyWarningEvaluationRequest,
    EarlyWarningAdvisory
)

# 2. Clean Database Imports (The Dual-Database Approach)
# Adjust these imports to match the exact names of your CRUD files
from backend.database.firestore_crud import save_early_warning_firestore
from backend.database.bigquery_crud import log_warning_bigquery

router = APIRouter(prefix="/api/v1/early-warning", tags=["Predictive Early Warning"])

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

    # Fungal pathogen risk
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
    Automatically persists alerts to Firestore (for mobile) and BigQuery (for analytics).
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

        # 3. The Best Approach: Dual-Database Write
        if analysis["anomaly_detected"]:
            # A. Save full data to Firestore for the UI
            save_early_warning_firestore(
                warning_id=warning_id,
                farmer_id=payload.farmer_id,
                latitude=payload.latitude,
                longitude=payload.longitude,
                zone=payload.zone,
                advisory_data=advisory_record.model_dump()
            )
            
            # B. Save flat metrics to BigQuery for the Dashboard
            log_warning_bigquery(
                warning_id=warning_id,
                farmer_id=payload.farmer_id,
                zone=payload.zone,
                risk_level=analysis["risk_level"],
                stress_type=analysis["predicted_stress_type"] or "Unknown"
            )

        return advisory_record

    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(exc)}")