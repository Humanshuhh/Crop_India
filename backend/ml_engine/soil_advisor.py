# backend/ml_engine/soil_advisor.py

import os
import asyncio
import logging
from typing import Any, Optional
from dotenv import load_dotenv
from google import genai
from google.genai import types

from backend.agronomy.soil_normalizer import soil_normalizer, NormalizedSoilProfile
from backend.agronomy.agro_climatic import agro_climatic_engine, ZoneProfile
from backend.agronomy.geospatial_adapter import geospatial_adapter, SatelliteTelemetry
from backend.schemas.soil_schemas import (
    SoilHealthInput,
    RegenerativeAdvisoryResponse,
    BiologicalAmendment,
    RegenerativeRotation,
)
from backend.utils.gemini_client import async_generate_content_with_backoff

logger = logging.getLogger("cropindia.soil_advisor")

load_dotenv()


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
        # Primary verified active model with fast backup
        self.candidate_models = [
            "gemini-3.5-flash-lite",
            "gemini-3.8-flash",
        ]

    def _get_fallback_advisory(
        self,
        soil_profile: NormalizedSoilProfile,
        zone: ZoneProfile,
        target_lang: str,
    ) -> RegenerativeAdvisoryResponse:
        """Instant zero-latency rule-based fallback advisory adhering to ICAR regenerative guidelines."""
        is_hindi = (target_lang or "en").startswith("hi")
        is_marathi = (target_lang or "en").startswith("mr")

        if is_hindi:
            return RegenerativeAdvisoryResponse(
                soil_health_assessment=f"{zone.zone_name} क्षेत्र के लिए मृदा स्वास्थ्य विश्लेषण: मिट्टी का pH {soil_profile.ph_value} और जैविक कार्बन {soil_profile.soc_percent}% है।",
                synthetic_chemical_alert="यूरिया एवं डीएपी के अत्यधिक उपयोग से बचें। जैविक खाद एवं जीवामृत का उपयोग बढ़ाएं।",
                biological_amendments=[
                    BiologicalAmendment(
                        name="जीवामृत (Jeevamrit)",
                        target_deficiency="मृदा जैविक कार्बन एवं सूक्ष्मजीव संवर्धन",
                        preparation_or_sourcing="देसी गाय का गोबर 10 किग्रा, गोमूत्र 10 ली, गुड़ 2 किग्रा, बेसन 2 किग्रा, सजीव मिट्टी 100 ग्राम को 200 लीटर पानी में 5-7 दिन किण्वित करें।",
                        dosage_and_application="200 लीटर प्रति एकड़ सिंचाई जल के साथ प्रयोग करें।"
                    ),
                    BiologicalAmendment(
                        name="ट्राइकोडर्मा संवर्धित गोबर खाद (FYM)",
                        target_deficiency="मृदा जनित रोग एवं बायोमास सुधार",
                        preparation_or_sourcing="100 किग्रा देसी गोबर की खाद में 2 किग्रा ट्राइकोडर्मा मिलाकर छाया में रखें।",
                        dosage_and_application="बुवाई पूर्व 100 किग्रा प्रति एकड़ खेत में मिलाएं।"
                    ),
                ],
                regenerative_crop_rotations=[
                    RegenerativeRotation(
                        season="Zaid / ग्रीष्मकालीन",
                        recommended_crop="ढैंचा (Dhaincha) हरी खाद",
                        ecological_role="वायुमंडलीय नाइट्रोजन स्थिरीकरण एवं जैविक खाद",
                        water_requirement="कम"
                    ),
                    RegenerativeRotation(
                        season="Kharif / खरीफ",
                        recommended_crop="बाजरा + अरहर (मिश्रित खेती)",
                        ecological_role="सूखा सहनशीलता और मिट्टी की उर्वरता में सुधार",
                        water_requirement="मध्यम"
                    ),
                ],
                cultural_water_practices=["फसल अवशेषों से मल्चिंग करें", "शून्य या न्यूनतम जुताई (Zero Tillage) अपनाएं"],
                spoken_summary="किसान भाई, आपकी मिट्टी में जैविक कार्बन और सूक्ष्मजीवों को बढ़ाने के लिए जीवामृत का प्रयोग करें और खरीफ में बाजरा और अरहर की मिश्रित फसल लगाएं।"
            )

        if is_marathi:
            return RegenerativeAdvisoryResponse(
                soil_health_assessment=f"{zone.zone_name} विभागासाठी माती आरोग्य विश्लेषण: मातीचा सामू (pH) {soil_profile.ph_value} आणि सेंद्रिय कर्ब {soil_profile.soc_percent}% आहे.",
                synthetic_chemical_alert="रासायनिक खतांचा अतिवापर टाळा. सेंद्रिय व जैविक घटकांचा वापर वाढवा.",
                biological_amendments=[
                    BiologicalAmendment(
                        name="जीवामृत (Jeevamrit)",
                        target_deficiency="सेंद्रिय कर्ब व सूक्ष्मजीव वाढ",
                        preparation_or_sourcing="देशी गाईचे शेण १० किलो, गोमूत्र १० ली, गूळ २ किलो, बेसन २ किलो २०० लिटर पाण्यात ५-७ दिवस आंबवा.",
                        dosage_and_application="प्रति एकर २०० लिटर पाण्यातून सिंचनासोबत द्या."
                    ),
                ],
                regenerative_crop_rotations=[
                    RegenerativeRotation(
                        season="उन्हाळी / Zaid",
                        recommended_crop="ताग / धैंचा हिरवळीचे खत",
                        ecological_role="नायट्रोजन स्थिरीकरण आणि सेंद्रिय कर्ब वाढवणे",
                        water_requirement="कमी"
                    ),
                ],
                cultural_water_practices=["पिकांच्या अवशेषांचे आच्छादन (Mulching) करा", "किमान मशागत पद्धत वापरा"],
                spoken_summary="शेतकरी बंधू, मातीची सुपीकता सुधारण्यासाठी जीवामृताचा वापर करा आणि हिरवळीचे खत घ्या."
            )

        return RegenerativeAdvisoryResponse(
            soil_health_assessment=f"Soil profile for {zone.zone_name}: pH is {soil_profile.ph_value} and Organic Carbon is {soil_profile.soc_percent}%.",
            synthetic_chemical_alert="Avoid excessive synthetic chemical fertilizers (Urea/DAP). Prioritize microbial nutrition.",
            biological_amendments=[
                BiologicalAmendment(
                    name="Jeevamrit Bio-Formulation",
                    target_deficiency="Soil Organic Carbon and beneficial microbes",
                    preparation_or_sourcing="Ferment 10kg cow dung, 10L cow urine, 2kg jaggery, 2kg pulse flour in 200L water for 5-7 days.",
                    dosage_and_application="Apply 200 liters per acre with irrigation water."
                ),
                BiologicalAmendment(
                    name="Trichoderma Enriched FYM",
                    target_deficiency="Basal Nitrogen and soil-borne fungal pathogens",
                    preparation_or_sourcing="Blend 100kg farmyard manure with 2kg Trichoderma harzianum under shade.",
                    dosage_and_application="Incorporate 100kg per acre during field preparation."
                )
            ],
            regenerative_crop_rotations=[
                RegenerativeRotation(
                    season="Zaid / Summer",
                    recommended_crop="Dhaincha (Sesbania) Green Manure",
                    ecological_role="Biological nitrogen fixation and organic biomass incorporation",
                    water_requirement="Low"
                ),
                RegenerativeRotation(
                    season="Kharif",
                    recommended_crop="Pearl Millet (Bajra) intercropped with Pigeon Pea (Arhar)",
                    ecological_role="Drought resilience and monoculture disruption",
                    water_requirement="Medium"
                ),
            ],
            cultural_water_practices=["Residue mulching", "Reduced conservation tillage"],
            spoken_summary="Dear farmer, apply Jeevamrit with irrigation to restore soil microbial carbon and adopt pearl millet with pigeon pea intercropping."
        )

    async def async_evaluate_and_advise(self, input_data: SoilHealthInput) -> RegenerativeAdvisoryResponse:
        """Asynchronous, non-blocking soil assessment with 10s ceiling and instant fallback."""
        soc_val = getattr(input_data, "organic_carbon_percent", getattr(input_data, "organic_carbon_pct", 0.0))

        raw_shc = {
            "ph": input_data.ph,
            "organic_carbon_percent": soc_val,
            "nitrogen_kg_ha": getattr(input_data, "nitrogen_kg_ha", 0.0),
            "phosphorus_kg_ha": getattr(input_data, "phosphorus_kg_ha", 0.0),
            "potassium_kg_ha": getattr(input_data, "potassium_kg_ha", 0.0),
            "zinc_ppm": getattr(input_data, "zinc_ppm", 0.0),
        }
        soil_profile: NormalizedSoilProfile = soil_normalizer.normalize(raw_shc)

        lat = getattr(input_data, "latitude", None) or 23.66
        lon = getattr(input_data, "longitude", None) or 86.42
        target_lang = getattr(input_data, "target_language", "en") or "en"

        # Fast in-memory agro-climatic resolution
        zone: ZoneProfile = agro_climatic_engine.resolve_zone(lat, lon)
        telemetry: SatelliteTelemetry = geospatial_adapter.build_telemetry_payload(lat, lon)

        if not self.client:
            logger.warning("No Gemini client configured. Returning agronomic rule-based fallback.")
            return self._get_fallback_advisory(soil_profile, zone, target_lang)

        deficits_str = ", ".join(soil_profile.critical_deficits) if soil_profile.critical_deficits else "None"
        millets_str = ", ".join(zone.recommended_millet_rotations) if zone.recommended_millet_rotations else "Pearl Millet (Bajra), Sorghum (Jowar)"
        pulses_str = ", ".join(zone.nitrogen_fixing_pulses) if zone.nitrogen_fixing_pulses else "Pigeon Pea (Arhar), Green Gram (Moong)"

        system_instruction = (
            "You are an expert regenerative agronomist for Indian smallholder farmers. "
            "Translate soil card metrics and satellite telemetry into actionable, non-chemical soil restoration advice. "
            "Prioritize green manuring (Dhaincha), bio-fertilizers (Jeevamrit, Rhizobium, PSB), and climate-resilient rotations (millets, pulses) over synthetic Urea and DAP. "
            f"MANDATORY: Language code is '{target_lang}'. Generate all text strictly in this language."
        )

        prompt_text = (
            f"LOCATION & ZONE: {zone.zone_name} (Soil: {zone.soil_type}, Stress: {zone.climate_classification})\n"
            f"SOIL CARD STATUS: pH={soil_profile.ph_value} ({_extract_rating(soil_profile.ph_rating)}), "
            f"SOC={soil_profile.soc_percent}% ({_extract_rating(soil_profile.soc_rating)}), "
            f"N={_extract_rating(soil_profile.nitrogen_rating)}, P={_extract_rating(soil_profile.phosphorus_rating)}, "
            f"K={_extract_rating(soil_profile.potassium_rating)}, Zn={_extract_rating(soil_profile.zinc_rating)}, Deficits={deficits_str}\n"
            f"SATELLITE TELEMETRY: NDVI={telemetry.ndvi_score}, Moisture={telemetry.soil_moisture_status}, Drought={telemetry.drought_stress_level}\n"
            f"ROTATIONS: Millets=[{millets_str}], Pulses=[{pulses_str}]"
        )

        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_schema=RegenerativeAdvisoryResponse,
            temperature=0.15,
            safety_settings=[
                types.SafetySetting(
                    category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold=types.HarmBlockThreshold.BLOCK_ONLY_HIGH,
                ),
                types.SafetySetting(
                    category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold=types.HarmBlockThreshold.BLOCK_ONLY_HIGH,
                ),
            ],
        )

        for model_id in self.candidate_models:
            try:
                res = await asyncio.wait_for(
                    async_generate_content_with_backoff(
                        client=self.client,
                        model=model_id,
                        contents=prompt_text,
                        config=config,
                        max_retries=1,
                        base_delay=1.0,
                    ),
                    timeout=10.0,
                )

                if res and res.text:
                    clean_text = res.text.strip()
                    if clean_text.startswith("```"):
                        clean_text = clean_text.split("```")[1]
                        if clean_text.startswith("json"):
                            clean_text = clean_text[4:].strip()
                    return RegenerativeAdvisoryResponse.model_validate_json(clean_text)

            except Exception as exc:
                logger.warning(f"Soil model '{model_id}' failed: {exc}")
                continue

        logger.error("All Gemini soil tiers exhausted. Serving biological fallback.")
        return self._get_fallback_advisory(soil_profile, zone, target_lang)

    def evaluate_and_advise(self, input_data: SoilHealthInput) -> RegenerativeAdvisoryResponse:
        """Synchronous wrapper for legacy callers."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as pool:
                    return pool.submit(asyncio.run, self.async_evaluate_and_advise(input_data)).result()
            return loop.run_until_complete(self.async_evaluate_and_advise(input_data))
        except Exception:
            return asyncio.run(self.async_evaluate_and_advise(input_data))


soil_advisor_engine = SoilRegenerativeAdvisor()