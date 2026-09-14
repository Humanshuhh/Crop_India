import httpx
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

from backend.database.firebase import get_firestore_db
from backend.database.firestore_crud import save_early_warning_firestore
from backend.database.bigquery_crud import log_warning_bigquery
from backend.schemas.warning_schemas import (
    TelemetrySnapshot,
    EarlyWarningAdvisory,
)

logger = logging.getLogger("kisan_sahayak.telemetry_worker")
OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


async def fetch_weather_history(lat: float, lon: float) -> Dict[str, Any]:
    """Fetches the past 3 days of hourly temperature, relative humidity, and rainfall."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": ["temperature_2m", "relative_humidity_2m", "precipitation"],
        "past_days": 3,
        "forecast_days": 1,
        "timezone": "auto",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(OPEN_METEO_URL, params=params)
        response.raise_for_status()
        return response.json()


def simulate_satellite_indices(base_ndvi: float, weather_data: Dict[str, Any]) -> List[TelemetrySnapshot]:
    """Constructs rolling time-series combining weather readings with simulated spectral indices."""
    hourly = weather_data.get("hourly", {})
    times = hourly.get("time", [])
    temps = hourly.get("temperature_2m", [])
    humidities = hourly.get("relative_humidity_2m", [])
    rains = hourly.get("precipitation", [])

    snapshots: List[TelemetrySnapshot] = []
    step = 24
    for i in range(0, min(len(times), 72), step):
        t_c = temps[i] if i < len(temps) else 28.0
        rh = humidities[i] if i < len(humidities) else 75.0
        rf = sum(rains[max(0, i - 24):i]) if i < len(rains) else 0.0

        ndwi_val = 0.42 if rh > 80.0 or rf > 20.0 else 0.18
        ndvi_val = round(base_ndvi - (0.16 if rf > 25.0 else 0.02), 2)

        snapshots.append(
            TelemetrySnapshot(
                timestamp=datetime.now(timezone.utc) - timedelta(hours=(72 - i)),
                ndvi=ndvi_val,
                ndwi=ndwi_val,
                temperature_c=t_c,
                relative_humidity_pct=rh,
                rainfall_mm=rf,
            )
        )
    return snapshots


async def run_daily_telemetry_scan(db_client=None):
    """
    Background worker: scans registered farmers, evaluates risks,
    and persists alerts directly to Firestore and BigQuery.
    """
    # Import standalone logic here to completely prevent circular imports
    from backend.routers.early_warning import run_time_series_anomaly_check

    db = db_client or get_firestore_db()
    if db is None:
        return

    try:
        farmers_ref = db.collection("farmers").stream()
    except Exception as err:
        logger.error(f"[TelemetryWorker] Failed to query farmers: {err}")
        return

    for doc in farmers_ref:
        data = doc.to_dict()
        farmer_id = doc.id
        location = data.get("location", {})

        lat = location.get("latitude") or data.get("latitude")
        lon = location.get("longitude") or data.get("longitude")

        if not lat or not lon:
            continue

        try:
            weather_data = await fetch_weather_history(lat, lon)
            telemetry_series = simulate_satellite_indices(base_ndvi=0.65, weather_data=weather_data)

            analysis = run_time_series_anomaly_check(
                history=telemetry_series,
                baseline_ndvi=0.65
            )

            if analysis["anomaly_detected"]:
                warning_id = f"warn_{uuid.uuid4().hex[:10]}"
                advisory_record = EarlyWarningAdvisory(
                    warning_id=warning_id,
                    risk_level=analysis["risk_level"],
                    anomaly_detected=True,
                    predicted_stress_type=analysis["predicted_stress_type"],
                    confidence_score=analysis["confidence_score"],
                    proactive_actions=analysis["proactive_actions"],
                    spoken_advisory=analysis["spoken_advisory"],
                    timestamp=datetime.now(timezone.utc)
                )

                zone = data.get("zone", "Eastern Plateau and Hills Region")

                save_early_warning_firestore(
                    warning_id=warning_id,
                    farmer_id=farmer_id,
                    latitude=lat,
                    longitude=lon,
                    zone=zone,
                    advisory=advisory_record
                )

                log_warning_bigquery(
                    warning_id=warning_id,
                    farmer_id=farmer_id,
                    zone=zone,
                    risk_level=analysis["risk_level"],
                    stress_type=analysis["predicted_stress_type"] or "Unknown"
                )
                print(f"[ALERT] Farm {farmer_id} flagged: {analysis['predicted_stress_type']} (Risk: {analysis['risk_level']})")
            else:
                print(f"[OK] Farm {farmer_id} scan healthy.")

        except Exception as exc:
            logger.warning(f"[TelemetryWorker] Failed scan for farm {farmer_id}: {exc}")