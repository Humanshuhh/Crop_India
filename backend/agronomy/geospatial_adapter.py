import logging
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger("uvicorn.error")

class SatelliteTelemetry(BaseModel):
    latitude: float
    longitude: float
    ndvi_score: float = Field(..., ge=-1.0, le=1.0, description="Vegetation vigor index")
    ndwi_score: float = Field(..., ge=-1.0, le=1.0, description="Canopy water content index")
    soil_moisture_status: str
    drought_stress_level: str
    nearest_shc_station: str
    extracted_soil_type: Optional[str] = None
    extracted_soc_pct: Optional[float] = None
    extracted_soil_ph: Optional[float] = None
    kharif_rainfall_mm: Optional[float] = None
    forecast_7d_rainfall_mm: Optional[float] = None


class GeospatialAdapter:
    @staticmethod
    def build_telemetry_payload(
        lat: float,
        lon: float,
        gee_output: Optional[Dict[str, Any]] = None,
    ) -> SatelliteTelemetry:
        # 1. If telemetry not directly passed, call friend's engine
        if gee_output is None:
            try:
                from backend.agronomy.point_telemetry_engine import extract_field_telemetry
                gee_output = extract_field_telemetry(lat, lon)
            except Exception as exc:
                logger.warning(f"Could not fetch live GEE telemetry ({exc}). Using baseline fallback.")
                gee_output = {}

        # 2. Extract values matching your friend's JSON structure
        veg = gee_output.get("vegetation_indices", {})
        soil = gee_output.get("soil_profile", {})
        climate = gee_output.get("climate_and_weather", {})

        ndvi = veg.get("ndvi_harvest_peak", 0.32)
        ndwi = veg.get("ndwi_canopy_moisture", -0.10)
        rainfall_regime = climate.get("rainfall_regime", "Moderate / Semi-Arid")

        # 3. Derive operational stress states
        if ndvi < 0.25:
            moisture_status = "Sparse / Fallow / Bare Soil"
            drought_level = "HIGH" if "Arid" in rainfall_regime else "MODERATE"
        elif ndvi < 0.45:
            moisture_status = "Moderate Canopy / Mild Water Stress"
            drought_level = "MODERATE"
        else:
            moisture_status = "Dense Healthy Canopy"
            drought_level = "LOW"

        return SatelliteTelemetry(
            latitude=lat,
            longitude=lon,
            ndvi_score=round(ndvi, 2),
            ndwi_score=round(ndwi, 2),
            soil_moisture_status=moisture_status,
            drought_stress_level=drought_level,
            nearest_shc_station=soil.get("soil_type", "OpenLandMap Global Grid / ICAR"),
            extracted_soil_type=soil.get("soil_type"),
            extracted_soc_pct=soil.get("soil_organic_carbon_pct"),
            extracted_soil_ph=soil.get("soil_ph"),
            kharif_rainfall_mm=climate.get("cumulative_kharif_rainfall_mm"),
            forecast_7d_rainfall_mm=climate.get("forecast_7day_rainfall_mm")
        )

geospatial_adapter = GeospatialAdapter()
