"""
Soil Health Service
Geo-spatial lookup for Indian Soil Health Card (SHC) profiles & agro-climatic zones.
"""

import math
from typing import Dict, Any, Optional, Tuple
from backend.schemas.advisory_schemas import (
    NutrientRating,
    SoilHealthProfile,
    SoilCustomOverride,
    LocationContext,
)


class SoilService:
    """Geo-lookup mapping coordinates to Indian Soil Health Card profiles."""

    # Major Indian Agro-Climatic reference centroids with realistic SHC baselines
    AGRO_CLIMATIC_ZONES = [
        {
            "id": "IN-RJ-AZ04",
            "name": "Western Dry / Arid Zone (Thar/Marwar)",
            "state": "Rajasthan",
            "district": "Jaipur",
            "lat": 26.9124,
            "lon": 75.7873,
            "soil_type": "Desert Sandy Loam",
            "n_kg_ha": 180.0,
            "p_kg_ha": 14.5,
            "k_kg_ha": 310.0,
            "soc_pct": 0.35,  # Low Soil Organic Carbon
            "ph": 8.2,
            "ec": 0.45,
        },
        {
            "id": "IN-PB-AZ01",
            "name": "Trans-Gangetic Plains (Indo-Gangetic Alluvial)",
            "state": "Punjab",
            "district": "Ludhiana",
            "lat": 30.9010,
            "lon": 75.8573,
            "soil_type": "Alluvial Clay Loam",
            "n_kg_ha": 240.0,
            "p_kg_ha": 28.0,
            "k_kg_ha": 190.0,
            "soc_pct": 0.48,  # Degraded due to intensive monocropping
            "ph": 7.6,
            "ec": 0.32,
        },
        {
            "id": "IN-MH-AZ06",
            "name": "Western Plateau & Hill Zone (Vidarbha / Marathwada)",
            "state": "Maharashtra",
            "district": "Nagpur",
            "lat": 21.1458,
            "lon": 79.0882,
            "soil_type": "Deep Black Cotton Soil (Vertisol)",
            "n_kg_ha": 210.0,
            "p_kg_ha": 12.0,
            "k_kg_ha": 380.0,
            "soc_pct": 0.52,
            "ph": 7.9,
            "ec": 0.40,
        },
        {
            "id": "IN-KA-AZ05",
            "name": "Southern Plateau & Hills (Deccan Semiarid)",
            "state": "Karnataka",
            "district": "Bengaluru Rural",
            "lat": 13.2846,
            "lon": 77.5542,
            "soil_type": "Red Sandy Loam (Alfisols)",
            "n_kg_ha": 260.0,
            "p_kg_ha": 18.0,
            "k_kg_ha": 160.0,
            "soc_pct": 0.62,
            "ph": 6.5,
            "ec": 0.25,
        },
        {
            "id": "IN-UP-AZ03",
            "name": "Upper Gangetic Plains Zone",
            "state": "Uttar Pradesh",
            "district": "Varanasi",
            "lat": 25.3176,
            "lon": 82.9739,
            "soil_type": "Alluvial Loam",
            "n_kg_ha": 230.0,
            "p_kg_ha": 16.5,
            "k_kg_ha": 220.0,
            "soc_pct": 0.44,
            "ph": 7.4,
            "ec": 0.35,
        },
        {
            "id": "IN-GJ-AZ02",
            "name": "Gujarat Plains & Hills (Saurashtra Arid/Coastal)",
            "state": "Gujarat",
            "district": "Rajkot",
            "lat": 22.3039,
            "lon": 70.8022,
            "soil_type": "Medium Black Soil",
            "n_kg_ha": 195.0,
            "p_kg_ha": 15.0,
            "k_kg_ha": 290.0,
            "soc_pct": 0.40,
            "ph": 8.0,
            "ec": 0.55,
        },
        {
            "id": "IN-TN-AZ07",
            "name": "East Coast Plains & Hills (Cauvery Delta)",
            "state": "Tamil Nadu",
            "district": "Thanjavur",
            "lat": 10.7870,
            "lon": 79.1378,
            "soil_type": "Deltaic Alluvial Soil",
            "n_kg_ha": 275.0,
            "p_kg_ha": 22.0,
            "k_kg_ha": 240.0,
            "soc_pct": 0.68,
            "ph": 7.1,
            "ec": 0.30,
        },
        {
            "id": "IN-WB-AZ08",
            "name": "Lower Gangetic Plains Zone (Bengal Delta)",
            "state": "West Bengal",
            "district": "Burdwan",
            "lat": 23.2324,
            "lon": 87.8615,
            "soil_type": "Gangetic Alluvial Silt Loam",
            "n_kg_ha": 290.0,
            "p_kg_ha": 24.0,
            "k_kg_ha": 180.0,
            "soc_pct": 0.72,
            "ph": 6.8,
            "ec": 0.28,
        },
        {
            "id": "IN-MP-AZ09",
            "name": "Central Plateau & Hills (Malwa / Bundelkhand)",
            "state": "Madhya Pradesh",
            "district": "Bhopal",
            "lat": 23.2599,
            "lon": 77.4126,
            "soil_type": "Medium Black Cotton Soil",
            "n_kg_ha": 220.0,
            "p_kg_ha": 13.5,
            "k_kg_ha": 270.0,
            "soc_pct": 0.50,
            "ph": 7.7,
            "ec": 0.38,
        },
        {
            "id": "IN-AS-AZ10",
            "name": "Eastern Himalayan / Brahmaputra Valley",
            "state": "Assam",
            "district": "Guwahati",
            "lat": 26.1445,
            "lon": 91.7362,
            "soil_type": "Acidic Red & Lateritic Alluvial",
            "n_kg_ha": 310.0,
            "p_kg_ha": 19.0,
            "k_kg_ha": 150.0,
            "soc_pct": 0.88,
            "ph": 5.4,
            "ec": 0.18,
        },
    ]

    def resolve_location(
        self,
        lat: float,
        lon: float,
        state: Optional[str] = None,
        district: Optional[str] = None,
    ) -> LocationContext:
        """Resolve geographic and agro-climatic context via nearest centroid."""
        zone = self._find_nearest_zone(lat, lon)
        return LocationContext(
            latitude=lat,
            longitude=lon,
            state=state or zone["state"],
            district=district or zone["district"],
            agro_climatic_zone=zone["name"],
        )

    def get_soil_profile(
        self,
        lat: float,
        lon: float,
        override: Optional[SoilCustomOverride] = None,
    ) -> SoilHealthProfile:
        """Retrieve authentic Soil Health Card baseline or combine with custom farmer inputs."""
        zone = self._find_nearest_zone(lat, lon)

        n_val = override.nitrogen_kg_ha if (override and override.nitrogen_kg_ha is not None) else zone["n_kg_ha"]
        p_val = override.phosphorus_kg_ha if (override and override.phosphorus_kg_ha is not None) else zone["p_kg_ha"]
        k_val = override.potassium_kg_ha if (override and override.potassium_kg_ha is not None) else zone["k_kg_ha"]
        soc_val = override.organic_carbon_pct if (override and override.organic_carbon_pct is not None) else zone["soc_pct"]
        ph_val = override.ph if (override and override.ph is not None) else zone["ph"]
        soil_type = override.soil_type if (override and override.soil_type) else zone["soil_type"]

        shc_id = f"SHC-{zone['state'][:2].upper()}-{zone['id'][-4:]}-{abs(int(lat*100))}"

        return SoilHealthProfile(
            zone_name=zone["name"],
            soil_type=soil_type,
            nitrogen_kg_ha=round(n_val, 1),
            nitrogen_rating=self.rate_nitrogen(n_val),
            phosphorus_kg_ha=round(p_val, 1),
            phosphorus_rating=self.rate_phosphorus(p_val),
            potassium_kg_ha=round(k_val, 1),
            potassium_rating=self.rate_potassium(k_val),
            organic_carbon_pct=round(soc_val, 2),
            ph=round(ph_val, 1),
            electrical_conductivity_dsm=zone["ec"],
            soil_health_card_id=shc_id,
            is_custom_override=override is not None,
        )

    def _find_nearest_zone(self, lat: float, lon: float) -> Dict[str, Any]:
        """Find the nearest agro-climatic reference zone by Euclidean distance."""
        def dist(z):
            return math.hypot(z["lat"] - lat, z["lon"] - lon)

        return min(self.AGRO_CLIMATIC_ZONES, key=dist)

    @staticmethod
    def rate_nitrogen(n_val: float) -> NutrientRating:
        """Indian SHC N rating (kg/ha): <280 Low, 280-560 Med, >560 High."""
        if n_val < 280.0:
            return NutrientRating.LOW
        elif n_val <= 560.0:
            return NutrientRating.MEDIUM
        return NutrientRating.HIGH

    @staticmethod
    def rate_phosphorus(p_val: float) -> NutrientRating:
        """Indian SHC P rating (kg/ha): <10 Low, 10-25 Med, >25 High."""
        if p_val < 10.0:
            return NutrientRating.LOW
        elif p_val <= 25.0:
            return NutrientRating.MEDIUM
        return NutrientRating.HIGH

    @staticmethod
    def rate_potassium(k_val: float) -> NutrientRating:
        """Indian SHC K rating (kg/ha): <120 Low, 120-280 Med, >280 High."""
        if k_val < 120.0:
            return NutrientRating.LOW
        elif k_val <= 280.0:
            return NutrientRating.MEDIUM
        return NutrientRating.HIGH


soil_service = SoilService()
