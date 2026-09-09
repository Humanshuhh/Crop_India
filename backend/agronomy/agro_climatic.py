from typing import Dict, List
from pydantic import BaseModel

class ZoneProfile(BaseModel):
    zone_id: int
    zone_name: str
    contiguous_states: List[str]
    soil_type: str
    climate_classification: str
    recommended_millet_rotations: List[str]
    nitrogen_fixing_pulses: List[str]

class AgroClimaticEngine:
    ZONES_REGISTRY: Dict[int, ZoneProfile] = {
        6: ZoneProfile(
            zone_id=6,
            zone_name="Trans-Gangetic Plains",
            contiguous_states=["Punjab", "Haryana", "Delhi", "Rajasthan (Ganganagar)"],
            soil_type="Alluvial, semi-arid sandy loam",
            climate_classification="Semi-Arid, High Monoculture Stress (Rice-Wheat)",
            recommended_millet_rotations=["Pearl Millet (Bajra)", "Sorghum (Jowar)"],
            nitrogen_fixing_pulses=["Moong (Green Gram)", "Arhar (Pigeon Pea)", "Chickpea"],
        ),
        14: ZoneProfile(
            zone_id=14,
            zone_name="Western Dry Region",
            contiguous_states=["Rajasthan", "Northern Gujarat", "Southern Haryana"],
            soil_type="Desert soils, calcareous, low moisture retention",
            climate_classification="Arid, Water-Deficit, High Drought Risk",
            recommended_millet_rotations=["Pearl Millet (Bajra)", "Proso Millet (Cheena)"],
            nitrogen_fixing_pulses=["Moth Bean", "Cluster Bean (Guar)", "Cowpea (Lobia)"],
        ),
        7: ZoneProfile(
            zone_id=7,
            zone_name="Eastern Plateau and Hills",
            contiguous_states=["Jharkhand", "Odisha", "Chhattisgarh", "West Bengal (Purulia)"],
            soil_type="Red and lateritic, acidic, low phosphorus fix",
            climate_classification="Sub-Humid, Rainfed Upland",
            recommended_millet_rotations=["Finger Millet (Ragi)", "Little Millet (Kutki)", "Barnyard Millet"],
            nitrogen_fixing_pulses=["Black Gram (Urad)", "Pigeon Pea (Arhar)", "Horse Gram (Kulthi)"],
        ),
    }

    def resolve_zone(self, lat: float, lon: float) -> ZoneProfile:
        if lat >= 28.0 and lon <= 77.0:
            return self.ZONES_REGISTRY[14]
        elif lat >= 27.5 and lon > 74.0 and lon < 80.0:
            return self.ZONES_REGISTRY[6]
        else:
            return self.ZONES_REGISTRY[7]

# Instantiated object required for imports
agro_climatic_engine = AgroClimaticEngine()
