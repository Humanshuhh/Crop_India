import httpx
from typing import Optional

async def get_current_weather(latitude: float, longitude: float) -> Optional[dict]:
    """
    Fetches real-time weather and short-term forecast for given coordinates via Open-Meteo.
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": ["temperature_2m", "relative_humidity_2m", "precipitation", "weather_code"],
        "hourly": ["precipitation_probability"],
        "timezone": "auto",
        "forecast_days": 1,
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url, params=params)
            if response.status_code == 200:
                data = response.json()
                current = data.get("current", {})
                hourly = data.get("hourly", {})

                precip_probs = hourly.get("precipitation_probability", [])[:12]
                max_rain_chance = max(precip_probs) if precip_probs else 0

                return {
                    "temperature_c": current.get("temperature_2m"),
                    "humidity_pct": current.get("relative_humidity_2m"),
                    "current_precipitation_mm": current.get("precipitation"),
                    "next_12h_rain_chance_pct": max_rain_chance,
                }
    except Exception as exc:
        print(f"[Warning] Weather lookup failed: {exc}")

    return None
