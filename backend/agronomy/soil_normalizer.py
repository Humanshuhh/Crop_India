from enum import Enum
from typing import Dict, Any, List
from pydantic import BaseModel

class NutrientRating(str, Enum):
    DEFICIENT = "DEFICIENT"
    OPTIMAL = "OPTIMAL"
    EXCESSIVE = "EXCESSIVE"

class PHClassification(str, Enum):
    ACIDIC = "ACIDIC"
    OPTIMAL = "OPTIMAL"
    ALKALINE = "ALKALINE"

class NormalizedSoilProfile(BaseModel):
    ph_rating: PHClassification
    ph_value: float
    soc_rating: NutrientRating
    soc_percent: float
    is_critically_degraded: bool
    nitrogen_rating: NutrientRating
    phosphorus_rating: NutrientRating
    potassium_rating: NutrientRating
    zinc_rating: NutrientRating
    critical_deficits: List[str]
    organic_amendment_priority: str

class SoilNormalizerEngine:
    @staticmethod
    def evaluate_ph(ph: float) -> PHClassification:
        if ph < 6.5:
            return PHClassification.ACIDIC
        elif 6.5 <= ph <= 7.8:
            return PHClassification.OPTIMAL
        return PHClassification.ALKALINE

    @staticmethod
    def evaluate_soc(soc: float) -> NutrientRating:
        if soc < 0.50:
            return NutrientRating.DEFICIENT
        elif 0.50 <= soc <= 0.75:
            return NutrientRating.OPTIMAL
        return NutrientRating.EXCESSIVE

    @staticmethod
    def evaluate_n(n_kg_ha: float) -> NutrientRating:
        if n_kg_ha < 240.0:
            return NutrientRating.DEFICIENT
        elif 240.0 <= n_kg_ha <= 480.0:
            return NutrientRating.OPTIMAL
        return NutrientRating.EXCESSIVE

    @staticmethod
    def evaluate_p(p_kg_ha: float) -> NutrientRating:
        if p_kg_ha < 11.0:
            return NutrientRating.DEFICIENT
        elif 11.0 <= p_kg_ha <= 22.0:
            return NutrientRating.OPTIMAL
        return NutrientRating.EXCESSIVE

    @staticmethod
    def evaluate_k(k_kg_ha: float) -> NutrientRating:
        if k_kg_ha < 110.0:
            return NutrientRating.DEFICIENT
        elif 110.0 <= k_kg_ha <= 280.0:
            return NutrientRating.OPTIMAL
        return NutrientRating.EXCESSIVE

    @staticmethod
    def evaluate_zinc(zn_ppm: float) -> NutrientRating:
        if zn_ppm < 0.60:
            return NutrientRating.DEFICIENT
        return NutrientRating.OPTIMAL

    def normalize(self, raw_shc: Dict[str, float]) -> NormalizedSoilProfile:
        ph = raw_shc.get("ph", 7.0)
        soc = raw_shc.get("organic_carbon_percent", 0.45)
        n = raw_shc.get("nitrogen_kg_ha", 200.0)
        p = raw_shc.get("phosphorus_kg_ha", 15.0)
        k = raw_shc.get("potassium_kg_ha", 180.0)
        zn = raw_shc.get("zinc_ppm", 0.5)

        ph_status = self.evaluate_ph(ph)
        soc_status = self.evaluate_soc(soc)
        n_status = self.evaluate_n(n)
        p_status = self.evaluate_p(p)
        k_status = self.evaluate_k(k)
        zn_status = self.evaluate_zinc(zn)

        critical_deficits = []
        if soc_status == NutrientRating.DEFICIENT:
            critical_deficits.append("Soil Organic Carbon (<0.5%) - High Microbial Starvation")
        if zn_status == NutrientRating.DEFICIENT:
            critical_deficits.append("Zinc (<0.6 ppm) - Susceptible to Foliar Chlorosis/Khaira")
        if n_status == NutrientRating.DEFICIENT:
            critical_deficits.append("Available Nitrogen (<240 kg/ha)")
        if ph_status != PHClassification.OPTIMAL:
            critical_deficits.append(f"Imbalanced Soil pH ({ph}) - Nutrient Locking Risk")

        is_critically_degraded = soc < 0.50
        priority = (
            "URGENT: Rebuild active carbon via green manuring (Dhaincha/Sunnhemp) & vermicompost."
            if is_critically_degraded
            else "MAINTENANCE: Routine crop residue mulching and bio-fertilizer inoculation."
        )

        return NormalizedSoilProfile(
            ph_rating=ph_status,
            ph_value=ph,
            soc_rating=soc_status,
            soc_percent=soc,
            is_critically_degraded=is_critically_degraded,
            nitrogen_rating=n_status,
            phosphorus_rating=p_status,
            potassium_rating=k_status,
            zinc_rating=zn_status,
            critical_deficits=critical_deficits,
            organic_amendment_priority=priority,
        )

soil_normalizer = SoilNormalizerEngine()
