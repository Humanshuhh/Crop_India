import os
import logging
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types

from backend.agronomy.soil_normalizer import soil_normalizer, NormalizedSoilProfile
from backend.agronomy.agro_climatic import agro_climatic_engine, ZoneProfile
from backend.agronomy.geospatial_adapter import geospatial_adapter, SatelliteTelemetry
from backend.schemas.soil_schemas import SoilHealthInput, RegenerativeAdvisoryResponse

logger = logging.getLogger("uvicorn.error")

for candidate in [Path.cwd() / ".env", Path(__file__).resolve().parents[2] / ".env"]:
    if candidate.is_file():
        load_dotenv(dotenv_path=candidate, override=True)


def get_gemini_key() -> str:
    key = os.getenv("GEMINI_API_KEY")
    if key and key.strip():
        return key.strip()

    if os.name == "nt":
        import winreg
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Environment") as rkey:
                val, _ = winreg.QueryValueEx(rkey, "GEMINI_API_KEY")
                if val and val.strip():
                    return val.strip()
        except Exception:
            pass
    return ""


class SoilRegenerativeAdvisor:
    def __init__(self):
        self.api_key = get_gemini_key()
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None
        # Active supported model endpoints
        self.candidate_models = ["gemini-3.6-flash", "gemini-3.7-flash", "gemini-2.5-flash"]

    def evaluate_and_advise(self, input_data: SoilHealthInput) -> RegenerativeAdvisoryResponse:
        raw_shc = {
            "ph": input_data.ph,
            "organic_carbon_percent": input_data.organic_carbon_percent,
            "nitrogen_kg_ha": input_data.nitrogen_kg_ha,
            "phosphorus_kg_ha": input_data.phosphorus_kg_ha,
            "potassium_kg_ha": input_data.potassium_kg_ha,
            "zinc_ppm": input_data.zinc_ppm,
        }
        soil_profile: NormalizedSoilProfile = soil_normalizer.normalize(raw_shc)
        zone: ZoneProfile = agro_climatic_engine.resolve_zone(input_data.latitude, input_data.longitude)
        telemetry: SatelliteTelemetry = geospatial_adapter.build_telemetry_payload(input_data.latitude, input_data.longitude)

        system_instruction = (
            "You are an expert regenerative agronomist building a Digital Public Good for smallholder farmers. "
            "Translate soil card metrics and satellite telemetry into actionable, non-chemical soil restoration advice. "
            "Prioritize green manuring, bio-fertilizers, and water-resilient crop rotations (millets, pulses) over synthetic Urea and DAP. "
            "Provide a simple spoken script for the farmer."
        )

        prompt_text = f"""
        LOCATION & AGRO-CLIMATIC CONTEXT:
        - Zone: {zone.zone_name} (States: {', '.join(zone.contiguous_states)})
        - Soil Type: {zone.soil_type}
        - Climate Stress: {zone.climate_classification}

        SOIL CARD STATUS:
        - pH: {soil_profile.ph_value} ({soil_profile.ph_rating.value})
        - SOC: {soil_profile.soc_percent}% ({soil_profile.soc_rating.value})
        - Nitrogen: {soil_profile.nitrogen_rating.value}
        - Phosphorus: {soil_profile.phosphorus_rating.value}
        - Potassium: {soil_profile.potassium_rating.value}
        - Zinc: {soil_profile.zinc_rating.value}
        - Deficits: {', '.join(soil_profile.critical_deficits)}

        SATELLITE TELEMETRY:
        - NDVI: {telemetry.ndvi_score}
        - Moisture Status: {telemetry.soil_moisture_status}
        - Drought Risk: {telemetry.drought_stress_level}

        SUITABLE ZONE ROTATIONS:
        - Millets: {', '.join(zone.recommended_millet_rotations)}
        - Pulses: {', '.join(zone.nitrogen_fixing_pulses)}
        """

        if not self.client:
            raise RuntimeError("GEMINI_API_KEY is not configured.")

        last_err = None
        for model_id in self.candidate_models:
            try:
                res = self.client.models.generate_content(
                    model=model_id,
                    contents=prompt_text,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        response_schema=RegenerativeAdvisoryResponse,
                        temperature=0.1,
                    ),
                )
                return RegenerativeAdvisoryResponse.model_validate_json(res.text)
            except Exception as e:
                logger.warning(f"Model {model_id} failed: {e}")
                last_err = e

        raise RuntimeError(f"Advisory generation failed: {str(last_err)}")


soil_advisor_engine = SoilRegenerativeAdvisor()
