import os
import json
import re
import warnings
from typing import Optional
from google import genai
from google.genai import types

from backend.schemas.soil_schemas import (
    RegenerativeActionPlan,
    BioAmendment,
    CropRotationCycle,
)

warnings.filterwarnings("ignore", category=FutureWarning)


class RegenerativeRotationEngine:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        self.client = genai.Client(api_key=api_key) if api_key else None
        self.model_name = "gemini-2.5-flash"

    def _clean_and_parse_json(self, raw_text: str) -> dict:
        """Strips markdown formatting, code block fences, and extracts JSON content."""
        if not raw_text or not raw_text.strip():
            raise ValueError("Gemini returned an empty response.")

        cleaned = raw_text.strip()
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.MULTILINE)
        cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.MULTILINE).strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            match = re.search(r"(\{.*\})", cleaned, re.DOTALL)
            if match:
                return json.loads(match.group(1))
            raise ValueError(f"Failed to parse Gemini response as JSON: {raw_text}")

    def generate_plan(
        self,
        organic_carbon_pct: float,
        ph: float,
        texture: str,
        current_crop: str,
        target_language: str = "hi",
        zone: str = "Eastern Plateau & Hills",
    ) -> RegenerativeActionPlan:
        """
        Generates an organic, non-chemical soil restoration plan and crop rotation
        strategy tailored to smallholder agronomic conditions.
        """
        soc_status = "Critically Deficient" if organic_carbon_pct < 0.50 else "Moderate"

        system_instruction = (
            "You are an expert agronomist specializing in Indian smallholder regenerative agriculture. "
            "You provide actionable non-chemical, organic solutions to rebuild soil organic carbon and soil biology. "
            "Never recommend synthetic chemical fertilizers like Urea, DAP, or MOP. "
            "Always return strictly valid JSON conforming directly to the requested schema."
        )

        prompt = f"""
Given the following farm telemetry and soil test metrics:
- Agro-climatic Zone: {zone}
- Soil Organic Carbon (SOC): {organic_carbon_pct}% ({soc_status})
- Soil pH: {ph}
- Soil Texture: {texture}
- Current/Recent Crop: {current_crop}
- Target Spoken Language Code: {target_language}

Generate a comprehensive regenerative soil restoration plan.
Return a JSON object with the following exact keys:
{{
  "soil_health_assessment": "Detailed assessment of the current carbon depletion and pH",
  "synthetic_chemical_alert": "Explicit advisory warning against synthetic inputs like Urea and DAP",
  "biological_amendments": [
    {{
      "name": "Name of bio-formulation (e.g. Jeevamrit, Ghanjeevamrit, Trichoderma FYM)",
      "target_deficiency": "Deficiency addressed",
      "preparation_or_sourcing": "How the farmer prepares or sources it on-farm",
      "dosage_and_application": "Clear dosage per acre and frequency"
    }}
  ],
  "regenerative_crop_rotations": [
    {{
      "season": "Season name (e.g. Zaid, Kharif, Rabi)",
      "recommended_crop": "Legume, green manure, or resilient crop",
      "ecological_role": "Nitrogen fixation, biomass addition, or root aeration",
      "water_requirement": "Low / Medium / High"
    }}
  ],
  "cultural_water_practices": [
    "Practical water conservation and mulching methods"
  ],
  "spoken_summary": "A warm, natural 2-3 sentence advisory script in language '{target_language}' explaining what to do."
}}
"""

        if not self.client:
            raise ValueError("Gemini API client not initialized. GEMINI_API_KEY is missing.")

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    temperature=0.2,
                ),
            )

            raw_output = response.text if hasattr(response, "text") and response.text else ""
            data = self._clean_and_parse_json(raw_output)

            return RegenerativeActionPlan(
                soil_health_assessment=data.get("soil_health_assessment", ""),
                synthetic_chemical_alert=data.get("synthetic_chemical_alert", ""),
                biological_amendments=[
                    BioAmendment(**item) for item in data.get("biological_amendments", [])
                ],
                regenerative_crop_rotations=[
                    CropRotationCycle(**item) for item in data.get("regenerative_crop_rotations", [])
                ],
                cultural_water_practices=data.get("cultural_water_practices", []),
                spoken_summary=data.get("spoken_summary", ""),
            )

        except Exception as exc:
            raise ValueError(f"Failed to parse Gemini response: {str(exc)}") from exc


regenerative_engine = RegenerativeRotationEngine()