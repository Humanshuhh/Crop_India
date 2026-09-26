import os
import logging
from pathlib import Path
from typing import Any
from dotenv import load_dotenv
from google import genai
from google.genai import types

from backend.agronomy.soil_normalizer import soil_normalizer, NormalizedSoilProfile
from backend.agronomy.agro_climatic import agro_climatic_engine, ZoneProfile
from backend.agronomy.geospatial_adapter import geospatial_adapter, SatelliteTelemetry
from backend.schemas.soil_schemas import SoilHealthInput, RegenerativeAdvisoryResponse

logger = logging.getLogger("uvicorn.error")

# Load environment variables across possible working root paths
for candidate in [Path.cwd() / ".env", Path(__file__).resolve().parents[2] / ".env"]:
    if candidate.is_file():
        load_dotenv(dotenv_path=candidate, override=True)


def get_gemini_key() -> str:
    key = (
        os.getenv("GEMINI_API_KEY")
        or os.getenv("GOOGLE_API_KEY")
        or os.getenv("GOOGLE_GENAI_API_KEY")
    )
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


def _extract_rating(rating_obj: Any) -> str:
    """Safely extracts enum value or string representation."""
    if rating_obj is None:
        return "UNKNOWN"
    return getattr(rating_obj, "value", str(rating_obj))


class SoilRegenerativeAdvisor:
    def __init__(self):
        self.api_key = get_gemini_key()
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None
        # Valid standard GenAI endpoints
        self.candidate_models = ["gemini-3.6-flash", "gemini-3.7-flash"]

    def evaluate_and_advise(self, input_data: SoilHealthInput) -> RegenerativeAdvisoryResponse:
        if not self.client:
            raise RuntimeError("GEMINI_API_KEY is not configured. Set GEMINI_API_KEY in your .env file.")

        # Extract Organic Carbon % across varying schema conventions and new methods
        soc_val = getattr(input_data, "organic_carbon_pct", getattr(input_data, "organic_carbon_percent", 0.0))

        raw_shc = {
            "ph": input_data.ph,
            "organic_carbon_percent": soc_val,
            "nitrogen_kg_ha": getattr(input_data, "nitrogen_kg_ha", 0.0),
            "phosphorus_kg_ha": getattr(input_data, "phosphorus_kg_ha", 0.0),
            "potassium_kg_ha": getattr(input_data, "potassium_kg_ha", 0.0),
            "zinc_ppm": getattr(input_data, "zinc_ppm", 0.0),
        }
        soil_profile: NormalizedSoilProfile = soil_normalizer.normalize(raw_shc)

        # Coordinate fallback with default agronomic baseline
        lat = getattr(input_data, "latitude", None) or 23.66
        lon = getattr(input_data, "longitude", None) or 86.42
        target_lang = getattr(input_data, "target_language", "hi")

        zone: ZoneProfile = agro_climatic_engine.resolve_zone(lat, lon)
        telemetry: SatelliteTelemetry = geospatial_adapter.build_telemetry_payload(lat, lon)

        deficits_str = ", ".join(soil_profile.critical_deficits) if soil_profile.critical_deficits else "None"
        millets_str = ", ".join(zone.recommended_millet_rotations) if zone.recommended_millet_rotations else "Pearl Millet (Bajra), Sorghum (Jowar)"
        pulses_str = ", ".join(zone.nitrogen_fixing_pulses) if zone.nitrogen_fixing_pulses else "Pigeon Pea (Arhar), Green Gram (Moong)"

        system_instruction = (
            "You are an expert regenerative agronomist building a Digital Public Good for Indian smallholder farmers. "
            "Translate soil card metrics and satellite telemetry into actionable, non-chemical soil restoration advice. "
            "Prioritize green manuring (Dhaincha, Sunn hemp), bio-fertilizers (Jeevamrit, Rhizobium, PSB), and water-resilient crop rotations (millets, pulses) over synthetic Urea and DAP. "
            f"You MUST generate the 'spoken_summary' field strictly in the language/dialect of '{target_lang}' (e.g. conversational Hindi or regional vernacular) "
            "using comforting, non-technical words suitable for audio voice playback to low-literacy farmers."
        )

        prompt_text = f"""
        LOCATION & AGRO-CLIMATIC CONTEXT:
        - Zone: {zone.zone_name} (States: {', '.join(zone.contiguous_states)})
        - Soil Type: {zone.soil_type}
        - Climate Stress: {zone.climate_classification}

        SOIL CARD STATUS:
        - pH: {soil_profile.ph_value} ({_extract_rating(soil_profile.ph_rating)})
        - SOC: {soil_profile.soc_percent}% ({_extract_rating(soil_profile.soc_rating)})
        - Nitrogen: {_extract_rating(soil_profile.nitrogen_rating)}
        - Phosphorus: {_extract_rating(soil_profile.phosphorus_rating)}
        - Potassium: {_extract_rating(soil_profile.potassium_rating)}
        - Zinc: {_extract_rating(soil_profile.zinc_rating)}
        - Deficits: {deficits_str}

        SATELLITE TELEMETRY:
        - NDVI: {telemetry.ndvi_score}
        - Moisture Status: {telemetry.soil_moisture_status}
        - Drought Risk: {telemetry.drought_stress_level}

        SUITABLE ZONE ROTATIONS:
        - Millets: {millets_str}
        - Pulses: {pulses_str}
        """

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
                if not res.text:
                    raise ValueError("Received empty response from Gemini model.")

                return RegenerativeAdvisoryResponse.model_validate_json(res.text.strip())
            except Exception as e:
                logger.warning(f"Model {model_id} failed during soil advisory: {e}")
                last_err = e

        raise RuntimeError(f"All soil advisory models failed. Last error: {str(last_err)}")


soil_advisor_engine = SoilRegenerativeAdvisor()