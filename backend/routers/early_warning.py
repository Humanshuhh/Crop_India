import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import JSONResponse

from backend.schemas.warning_schemas import (
    EarlyWarningAdvisory,
    EarlyWarningEvaluationRequest,
    TelemetrySnapshot,
)
from backend.database.bigquery_crud import log_warning_bigquery
from backend.database.firestore_crud import (
    get_firestore_db,
    save_early_warning_firestore,
)

logger = logging.getLogger("kisan_sahayak.early_warning")
router = APIRouter(prefix="/api/v1/early-warning", tags=["Predictive Early Warning"])


def run_time_series_anomaly_check(
    history: List[TelemetrySnapshot], baseline_ndvi: float = 0.65
) -> Dict[str, Any]:
    if not history:
        raise ValueError("Telemetry series cannot be empty.")

    recent = history[-1]
    ndvi_drop = baseline_ndvi - recent.ndvi

    if recent.relative_humidity_pct > 80.0 and recent.ndwi > 0.4 and ndvi_drop > 0.15:
        return {
            "risk_level": "HIGH",
            "anomaly_detected": True,
            "predicted_stress_type": "Incipient Fungal Spore Proliferation (Pre-Symptomatic Blight)",
            "confidence_score": 0.88,
            "proactive_actions": [
                "Apply prophylactic spray of fermented sour buttermilk (Chaach) diluted 1:10 with water.",
                "Foliar spray of Pseudomonas fluorescens (20g/liter) during early morning hours.",
                "Inspect field bunds and drainage paths to avoid root zone water stagnation.",
            ],
            "spoken_advisory": "किसान भाई, उपग्रह डेटा के अनुसार आपके खेत में नमी अधिक होने से फफूंद लगने का खतरा है। पत्तों पर लक्षण दिखने से पहले ही खट्टी छाछ या स्यूडोमोनास का छिड़काव करें।",
        }

    if recent.ndwi < 0.1 and recent.temperature_c > 35.0:
        return {
            "risk_level": "MODERATE",
            "anomaly_detected": True,
            "predicted_stress_type": "Soil Moisture Stress / Canopy Dehydration",
            "confidence_score": 0.82,
            "proactive_actions": [
                "Apply straw or crop residue mulch to preserve residual root moisture.",
                "Administer light evening irrigation; avoid daytime peak heat.",
                "Spray 2% diluted Jeevamrit to strengthen foliar drought resilience.",
            ],
            "spoken_advisory": "किसान भाई, उपग्रह डेटा से पता चला है कि खेत की नमी तेजी से घट रही है। फसल को सूखने से बचाने के लिए पुआल की मल्चिंग करें और शाम को हल्की सिंचाई दें।",
        }

    return {
        "risk_level": "LOW",
        "anomaly_detected": False,
        "predicted_stress_type": None,
        "confidence_score": 0.95,
        "proactive_actions": [
            "Crop vitality index is normal. Continue planned organic maintenance."
        ],
        "spoken_advisory": "फसल का स्वास्थ्य सामान्य है। कोई पूर्व चेतावनी आवश्यक नहीं है।",
    }


@router.get("/alerts", status_code=status.HTTP_200_OK)
async def get_active_risk_alerts(
    lat: Optional[float] = Query(None, description="Latitude coordinate"),
    lon: Optional[float] = Query(None, description="Longitude coordinate"),
    farmer_id: Optional[str] = Query(None, description="Optional registered farmer ID"),
):
    from backend.agronomy.telemetry_worker import (
        fetch_weather_history,
        simulate_satellite_indices,
    )

    if farmer_id:
        db = get_firestore_db()
        if db:
            try:
                docs = (
                    db.collection("early_warnings")
                    .where("farmer_id", "==", farmer_id)
                    .order_by("created_at", direction="DESCENDING")
                    .limit(5)
                    .stream()
                )
                alerts = [d.to_dict() for d in docs]
                if alerts:
                    return {
                        "status": "connected",
                        "alerts_count": len(alerts),
                        "message": f"Retrieved {len(alerts)} active alerts for farmer {farmer_id}.",
                        "active_alerts": alerts,
                    }
            except Exception as e:
                logger.warning(f"Could not query firestore warnings: {e}")

    if lat is not None and lon is not None:
        try:
            weather_data = await fetch_weather_history(lat, lon)
            telemetry_series = simulate_satellite_indices(base_ndvi=0.65, weather_data=weather_data)
            analysis = run_time_series_anomaly_check(history=telemetry_series, baseline_ndvi=0.65)

            if analysis["anomaly_detected"]:
                return {
                    "status": "connected",
                    "alerts_count": 1,
                    "message": f"Active agronomic anomaly detected for ({lat}, {lon}).",
                    "active_alerts": [
                        {
                            "id": f"live_{uuid.uuid4().hex[:8]}",
                            "severity": analysis["risk_level"],
                            "type": analysis["predicted_stress_type"],
                            "confidence": analysis["confidence_score"],
                            "proactive_actions": analysis["proactive_actions"],
                            "spoken_advisory": analysis["spoken_advisory"],
                            "detected_at": datetime.now(timezone.utc).isoformat(),
                        }
                    ],
                }
            return {
                "status": "connected",
                "alerts_count": 0,
                "message": "Continuous micro-climate monitoring active. No critical anomalies detected.",
                "active_alerts": [],
            }
        except Exception as exc:
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content={
                    "status": "feed_pending",
                    "alerts_count": 0,
                    "message": f"Micro-climate telemetry feed currently unavailable: {exc}",
                    "active_alerts": [],
                },
            )

    return {
        "status": "connected",
        "alerts_count": 0,
        "message": "Specify latitude/longitude or farmer_id to query field risk alerts.",
        "active_alerts": [],
    }


@router.post("/evaluate-risk", response_model=EarlyWarningAdvisory, status_code=status.HTTP_200_OK)
async def evaluate_crop_risk(payload: EarlyWarningEvaluationRequest):
    try:
        analysis = run_time_series_anomaly_check(
            history=payload.telemetry_series,
            baseline_ndvi=payload.baseline_ndvi,
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
            timestamp=now,
        )

        if analysis["anomaly_detected"]:
            save_early_warning_firestore(
                warning_id=warning_id,
                farmer_id=payload.farmer_id,
                latitude=payload.latitude,
                longitude=payload.longitude,
                zone=payload.zone,
                advisory=advisory_record,
            )
            log_warning_bigquery(
                warning_id=warning_id,
                farmer_id=payload.farmer_id,
                zone=payload.zone,
                risk_level=analysis["risk_level"],
                stress_type=analysis["predicted_stress_type"] or "Unknown",
            )

        return advisory_record

    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(exc)}")