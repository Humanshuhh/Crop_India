import json
import logging
import os
from typing import Optional
from google import genai
from google.genai import types
from backend.schemas.soil_schemas import RegenerativeActionPlan

logger = logging.getLogger("kisan_sahayak.regenerative")

def resolve_api_key() -> Optional[str]:
    return (
        os.getenv("GEMINI_API_KEY")
        or os.getenv("GOOGLE_API_KEY")
        or os.getenv("GOOGLE_GENAI_API_KEY")
    )

class RegenerativeAgronomyEngine:
    def __init__(self):
        self.api_key = resolve_api_key()
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None

    def generate_plan(
        self,
        organic_carbon_pct: float,
        ph: float,
        texture: str,
        current_crop: str,
        target_language: str = "hi",
        zone: str = "Eastern Plateau & Trans-Gangetic Corridor"
    ) -> RegenerativeActionPlan:
        if not self.client:
            raise RuntimeError("Gemini API key is not configured.")

        # Flag critical soil depletion
        carbon_status = "Critically Deficient (< 0.50%)" if organic_carbon_pct < 0.50 else "Moderate"

        prompt = (
            "You are an expert regenerative agronomist and agro-ecologist advising Indian smallholder farmers.\n"
            f"The farmer's native language code is '{target_language}'.\n\n"
            "--- SOIL & AGRO-CLIMATIC TELEMETRY ---\n"
            f"- Agro-Climatic Zone: {zone}\n"
            f"- Soil Organic Carbon (SOC): {organic_carbon_pct}% ({carbon_status})\n"
            f"- Soil pH: {ph}\n"
            f"- Soil Texture: {texture}\n"
            f"- Current / Previous Crop: {current_crop}\n"
            "--------------------------------------\n\n"
            "MANDATORY REGENERATIVE RULES:\n"
            "1. ZERO SYNTHETIC CHEMICALS: Do NOT recommend chemical fertilizers (Urea, DAP, MOP) or synthetic pesticides.\n"
            "2. BIOLOGICAL AMENDMENTS: Prescribe bio-fertilizers (Azotobacter, Rhizobium, PSB), vermicompost, "
            "Jeevamrit, or green manuring (Dhaincha/Sunn hemp) specifically calibrated to restore depleted Soil Organic Carbon.\n"
            "3. ROTATION & DIVERSIFICATION: Break monoculture cycles (like continuous rice-wheat) by introducing "
            "climate-resilient millets (Bajra, Ragi, Jowar) and nitrogen-fixing legumes/pulses (Arhar, Gram, Moong).\n"
            "4. CULTURAL SOIL HYGIENE: Recommend conservation tillage, mulching with crop residue, and moisture retention.\n"
            "5. VOICE SCRIPT: Write the 'spoken_summary' entirely in the farmer's language '{target_language}' "
            "in an encouraging, plain conversational tone suitable for low-literacy farmers."
        )

        response = self.client.models.generate_content(
            model="gemini-3.6-flash",
            contents=[prompt],
            config=types.GenerateContentConfig(
                temperature=0.2,
                response_mime_type="application/json",
                response_schema=RegenerativeActionPlan,
                tools=None,
            ),
        )

        return RegenerativeActionPlan(**json.loads(response.text.strip()))

regenerative_engine = RegenerativeAgronomyEngine()