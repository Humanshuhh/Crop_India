import io
import os
import logging
from PIL import Image
from dotenv import load_dotenv
from google import genai
from google.genai import types

from backend.schemas.diagnosis_schemas import CropDiagnosisResponse

logger = logging.getLogger("uvicorn.error")
load_dotenv(override=True)


def resolve_api_key() -> str:
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


class PlantDiagnosticsEngine:
    def __init__(self):
        self.api_key = resolve_api_key()
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None
        self.candidate_models = ["gemini-3.6-flash", "gemini-3.7-flash", "gemini-2.5-flash"]

    def diagnose_leaf_image(self, image_bytes: bytes) -> CropDiagnosisResponse:
        if not self.client:
            raise RuntimeError("GEMINI_API_KEY is not set.")

        pil_image = Image.open(io.BytesIO(image_bytes))

        system_instruction = (
            "You are an expert plant pathologist and agronomist for a Digital Public Good serving smallholder farmers. "
            "Analyze leaf photos to identify foliar diseases, pest damage, or abiotic nutrient deficiencies. "
            "If the photo does not clearly show an agricultural plant or leaf, set is_plant_detected to False. "
            "Prioritize biological, non-chemical, and low-cost botanical remedies (Neem kernel extract, Trichoderma, sour buttermilk, biocontrol agents). "
            "Never recommend synthetic chemical pesticides, weedicides, or high-toxicity insecticides."
        )

        prompt = (
            "Examine this plant leaf image in detail. "
            "Identify the crop, inspect any lesions, spots, or discoloration, "
            "diagnose the root cause, and provide organic eco-friendly interventions."
        )

        last_err = None
        for model_id in self.candidate_models:
            try:
                response = self.client.models.generate_content(
                    model=model_id,
                    contents=[pil_image, prompt],
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        response_schema=CropDiagnosisResponse,
                        temperature=0.1,
                    ),
                )
                return CropDiagnosisResponse.model_validate_json(response.text)
            except Exception as e:
                logger.warning(f"Diagnostic model {model_id} failed: {e}")
                last_err = e

        raise RuntimeError(f"Plant diagnosis failed across models: {str(last_err)}")


plant_diagnostics_engine = PlantDiagnosticsEngine()
