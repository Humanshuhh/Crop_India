# backend/agronomy/telemetry_worker.py

import httpx
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from backend.routers.early_warning import (
    TelemetrySnapshot,
    EarlyWarningEvaluationRequest,
    evaluate_crop_risk,
)

# Open-Meteo requires no API key for non-commercial/dev tiers
OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


async def fetch_weather_history(lat: float, lon: float) -> Dict[str, Any]:
    """
    Fetches the past 3 days of hourly temperature, relative humidity, and rainfall.
    """
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
    """
    Constructs a rolling time-series snapshot.
    Combines live weather readings with computed spectral indices.
    """
    hourly = weather_data.get("hourly", {})
    times = hourly.get("time", [])
    temps = hourly.get("temperature_2m", [])
    humidities = hourly.get("relative_humidity_2m", [])
    rains = hourly.get("precipitation", [])

    snapshots: List[TelemetrySnapshot] = []

    # Sample daily readings at midday (every 24 hours) over the last 3 days
    step = 24
    for i in range(0, min(len(times), 72), step):
        t_c = temps[i] if i < len(temps) else 28.0
        rh = humidities[i] if i < len(humidities) else 75.0
        rf = sum(rains[max(0, i - 24):i]) if i < len(rains) else 0.0

        # When rain & humidity persist, simulate microclimatic canopy moisture (NDWI) rise
        ndwi_val = 0.42 if rh > 80.0 or rf > 20.0 else 0.18
        # Vegetation drop under persistent pathogen pressure / cloud stress
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


async def run_daily_telemetry_scan(db_client):
    """
    Queries registered farmers, collects weather/satellite signals,
    and runs anomaly checks automatically.
    """
    if db_client is None:
        print("[TelemetryWorker] Database client not configured. Skipping scan.")
        return

    farmers_ref = db_client.collection("farmers").stream()

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

            request_payload = EarlyWarningEvaluationRequest(
                farmer_id=farmer_id,
                latitude=lat,
                longitude=lon,
                zone=data.get("zone", "Eastern Plateau & Hills"),
                target_language="hi",
                baseline_ndvi=0.65,
                telemetry_series=telemetry_series,
            )

            # Evaluate without manual HTTP intervention
            advisory = await evaluate_crop_risk(request_payload)

            if advisory.anomaly_detected:
                print(f"[ALERT] Farm {farmer_id} flagged: {advisory.predicted_stress_type} (Risk: {advisory.risk_level})")
            else:
                print(f"[OK] Farm {farmer_id} scan healthy.")

        except Exception as exc:
            print(f"[TelemetryWorker Error] Failed scan for farm {farmer_id}: {str(exc)}")