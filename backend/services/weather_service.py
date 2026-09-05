"""
Weather Service
Async Open-Meteo 14-day forecast client with resilient offline/hackathon fallback.
"""

import logging
from typing import Dict, Any, Optional
import httpx
from backend.config import settings
from backend.schemas.advisory_schemas import WeatherSummary

logger = logging.getLogger("naarin.weather_service")


class WeatherService:
    """Async weather client querying Open-Meteo with zero-crash fallback."""

    def __init__(self, base_url: Optional[str] = None, timeout: Optional[float] = None):
        self.base_url = base_url or settings.OPEN_METEO_BASE_URL
        self.timeout = timeout or settings.WEATHER_REQUEST_TIMEOUT_SECONDS

    async def get_14day_forecast(self, latitude: float, longitude: float) -> WeatherSummary:
        """
        Fetch 14-day precipitation, temperature, and topsoil moisture from Open-Meteo.
        Falls back to regional synthetic climatology if offline or unreachable.
        """
        params = {
            "latitude": round(latitude, 4),
            "longitude": round(longitude, 4),
            "daily": ["precipitation_sum", "temperature_2m_max", "temperature_2m_min"],
            "hourly": ["soil_moisture_0_to_1cm"],
            "timezone": "auto",
            "forecast_days": 14,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(self.base_url, params=params)
                if response.status_code == 200:
                    data = response.json()
                    return self._parse_open_meteo_response(data)
                else:
                    logger.warning(
                        f"Open-Meteo API returned status {response.status_code}. Using fallback forecast."
                    )
        except (httpx.RequestError, httpx.TimeoutException, Exception) as exc:
            logger.warning(f"Unable to connect to Open-Meteo ({exc}). Engaging resilient fallback.")

        return self._generate_fallback_forecast(latitude, longitude)

    def _parse_open_meteo_response(self, data: Dict[str, Any]) -> WeatherSummary:
        """Parse raw Open-Meteo JSON into WeatherSummary."""
        daily = data.get("daily", {})
        hourly = data.get("hourly", {})

        precip_list = daily.get("precipitation_sum", [])
        temp_max_list = daily.get("temperature_2m_max", [])
        temp_min_list = daily.get("temperature_2m_min", [])
        moisture_list = hourly.get("soil_moisture_0_to_1cm", [])

        # Calculate metrics
        valid_precip = [p for p in precip_list if p is not None]
        rainfall_sum = round(float(sum(valid_precip)), 2) if valid_precip else 0.0

        valid_max = [t for t in temp_max_list if t is not None]
        temp_max_avg = round(float(sum(valid_max) / len(valid_max)), 1) if valid_max else 32.0

        valid_min = [t for t in temp_min_list if t is not None]
        temp_min_avg = round(float(sum(valid_min) / len(valid_min)), 1) if valid_min else 22.0

        valid_moisture = [m for m in moisture_list if m is not None]
        moisture_avg = (
            round(float(sum(valid_moisture) / len(valid_moisture)), 3)
            if valid_moisture
            else 0.22
        )

        drought_risk = rainfall_sum < 30.0 or moisture_avg < 0.16
        heatwave_risk = temp_max_avg >= 39.0

        return WeatherSummary(
            rainfall_14d_sum_mm=rainfall_sum,
            temp_2m_max_avg_c=temp_max_avg,
            temp_2m_min_avg_c=temp_min_avg,
            topsoil_moisture_avg_m3m3=moisture_avg,
            drought_risk=drought_risk,
            heatwave_risk=heatwave_risk,
            forecast_source="Open-Meteo Live API",
        )

    def _generate_fallback_forecast(self, latitude: float, longitude: float) -> WeatherSummary:
        """Generate agro-climatically realistic fallback data based on coordinate regions."""
        # Arid Western India (Rajasthan / North Gujarat)
        if 23.5 <= latitude <= 30.0 and 68.0 <= longitude <= 76.5:
            rainfall = 14.5
            temp_max = 38.5
            temp_min = 26.0
            moisture = 0.12
        # Indo-Gangetic Plains (Punjab / Haryana / UP / Bihar)
        elif 25.0 <= latitude <= 32.0 and 74.0 <= longitude <= 88.0:
            rainfall = 48.0
            temp_max = 33.5
            temp_min = 23.0
            moisture = 0.28
        # Deccan Plateau (Maharashtra / Karnataka / Telangana)
        elif 14.0 <= latitude <= 21.5 and 73.5 <= longitude <= 80.5:
            rainfall = 34.0
            temp_max = 32.0
            temp_min = 21.5
            moisture = 0.22
        # Coastal & Southern India (Kerala / Tamil Nadu / Andhra Coastal)
        elif 8.0 <= latitude <= 16.0 and 75.0 <= longitude <= 83.0:
            rainfall = 65.0
            temp_max = 31.0
            temp_min = 24.5
            moisture = 0.35
        # Default All-India average
        else:
            rainfall = 28.0
            temp_max = 34.0
            temp_min = 23.0
            moisture = 0.20

        drought_risk = rainfall < 30.0 or moisture < 0.16
        heatwave_risk = temp_max >= 39.0

        return WeatherSummary(
            rainfall_14d_sum_mm=rainfall,
            temp_2m_max_avg_c=temp_max,
            temp_2m_min_avg_c=temp_min,
            topsoil_moisture_avg_m3m3=moisture,
            drought_risk=drought_risk,
            heatwave_risk=heatwave_risk,
            forecast_source="Synthetic Agro-Climatic Climatology (Offline Fallback)",
        )


weather_service = WeatherService()
