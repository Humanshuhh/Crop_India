"""
AgriStack UFSI Router
Standards-compliant Digital Public Good endpoints adhering to India's AgriStack UFSI v1.0 specifications.
"""

from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Query, status
from backend.config import settings
from backend.schemas.agristack_schemas import (
    AgriStackFeatureCollection,
    AgriStackGeoJSONFeature,
    GeoJSONGeometryPoint,
    AgriStackAdvisoryProperties,
)
from backend.services.soil_service import soil_service

router = APIRouter(prefix="/agristack", tags=["AgriStack UFSI Open Standards"])


@router.get(
    "/ufsi/v1/advisories",
    response_model=AgriStackFeatureCollection,
    response_model_by_alias=True,
    status_code=status.HTTP_200_OK,
    summary="AgriStack UFSI Standards-Compliant GeoJSON & JSON-LD Advisories",
    description=(
        "Returns active regenerative agro-advisories formatted as a GeoJSON FeatureCollection "
        "with India AgriStack JSON-LD semantics (@context: 'https://agristack.gov.in/contexts/v1/advisory.jsonld'). "
        "Complies with Digital Public Good standards for inter-departmental agricultural data exchange."
    ),
)
async def get_ufsi_advisories(
    state: Optional[str] = Query(None, description="Filter by Indian State code or name (e.g., 'Rajasthan', 'RJ')"),
    district: Optional[str] = Query(None, description="Filter by District name (e.g., 'Jaipur')"),
    crop_code: Optional[str] = Query(None, description="Filter by UFSI Crop Code (e.g., 'MHT-01', 'PUL-03')"),
    lat: Optional[float] = Query(None, ge=-90.0, le=90.0, description="Spatial query latitude"),
    lon: Optional[float] = Query(None, ge=-180.0, le=180.0, description="Spatial query longitude"),
    limit: int = Query(10, ge=1, le=100, description="Maximum number of features to return"),
) -> AgriStackFeatureCollection:
    """Retrieve GeoJSON FeatureCollection with AgriStack JSON-LD metadata."""
    features: List[AgriStackGeoJSONFeature] = []

    # Reference mock data generated from agro-climatic zones
    for zone in soil_service.AGRO_CLIMATIC_ZONES:
        # State filter
        if state and state.lower() not in zone["state"].lower() and state.upper() not in zone["id"]:
            continue
        # District filter
        if district and district.lower() not in zone["district"].lower():
            continue

        feature_id = f"UFSI-{zone['id']}-2026-ADV"
        is_arid = "Arid" in zone["name"] or zone["soc_pct"] < 0.45

        crop_cd = "MHT-01" if is_arid else "CER-02"
        crop_nm = "Pearl Millet (Bajra)" if is_arid else "Wheat (Pusa Tejas)"
        
        if crop_code and crop_code.upper() != crop_cd:
            continue

        props = AgriStackAdvisoryProperties(
            at_type="AgroAdvisory",
            advisoryId=feature_id,
            farmerZoneCode=zone["id"],
            stateCode=zone["id"].split("-")[1],
            districtCode=zone["district"][:3].upper(),
            validityStart="2026-09-01T00:00:00Z",
            validityEnd="2026-09-20T23:59:59Z",
            cropCode=crop_cd,
            cropName=crop_nm,
            soilHealthIndex=round(zone["soc_pct"] * 100 + 35.0, 1),
            soilOrganicCarbonPct=zone["soc_pct"],
            npkRating={
                "N": soil_service.rate_nitrogen(zone["n_kg_ha"]).value,
                "P": soil_service.rate_phosphorus(zone["p_kg_ha"]).value,
                "K": soil_service.rate_potassium(zone["k_kg_ha"]).value,
            },
            advisoryTitle=f"Regenerative {crop_nm} & Bio-Inoculation Advisory for {zone['district']}",
            advisoryMessage=(
                f"For {zone['soil_type']} in {zone['name']}, apply Jeevamrutha @ 200L/acre. "
                "Maintain 70% straw mulch to conserve root-zone capillary water."
            ),
            recommendedIntervention={
                "primaryCrop": crop_nm,
                "intercrop": "Pigeon Pea (ICPL-87)" if is_arid else "Chickpea (JG-11)",
                "bioFertilizer": "Jeevamrutha + Trichoderma viride",
                "recommendedSpacing": "45cm x 15cm",
            },
            regenerativeCompliance={
                "mulchingRequired": True,
                "zeroTillageRecommended": True,
                "chemicalFertilizerReductionPct": 35,
            },
        )

        geom = GeoJSONGeometryPoint(type="Point", coordinates=[zone["lon"], zone["lat"]])

        features.append(
            AgriStackGeoJSONFeature(
                type="Feature",
                id=feature_id,
                geometry=geom,
                properties=props,
            )
        )

        if len(features) >= limit:
            break

    # If spatial query requested specific point not in filtered list, add localized feature
    if lat is not None and lon is not None and len(features) == 0:
        loc = soil_service.resolve_location(lat, lon, state, district)
        soil = soil_service.get_soil_profile(lat, lon)
        feat_id = f"UFSI-POINT-{abs(int(lat*100))}-{abs(int(lon*100))}"

        props = AgriStackAdvisoryProperties(
            at_type="AgroAdvisory",
            advisoryId=feat_id,
            farmerZoneCode="IN-UFSI-CUSTOM",
            stateCode=loc.state[:2].upper(),
            districtCode=loc.district[:3].upper(),
            validityStart="2026-09-01T00:00:00Z",
            validityEnd="2026-09-20T23:59:59Z",
            cropCode="GEN-01",
            cropName="Multi-Crop Regenerative Zone",
            soilHealthIndex=72.0,
            soilOrganicCarbonPct=soil.organic_carbon_pct,
            npkRating={
                "N": soil.nitrogen_rating.value,
                "P": soil.phosphorus_rating.value,
                "K": soil.potassium_rating.value,
            },
            advisoryTitle=f"Localized Soil Advisory for {loc.district}, {loc.state}",
            advisoryMessage="Promote soil biodiversity via legume intercropping and biochar application.",
            recommendedIntervention={
                "primaryCrop": "Climate Resilient Legume / Millet",
                "bioFertilizer": "Jeevamrutha Culture",
            },
            regenerativeCompliance={
                "mulchingRequired": True,
                "chemicalFertilizerReductionPct": 30,
            },
        )
        features.append(
            AgriStackGeoJSONFeature(
                type="Feature",
                id=feat_id,
                geometry=GeoJSONGeometryPoint(type="Point", coordinates=[lon, lat]),
                properties=props,
            )
        )

    return AgriStackFeatureCollection(
        at_context=settings.AGRISTACK_CONTEXT_URL,
        type="FeatureCollection",
        standard=f"AgriStack UFSI {settings.AGRISTACK_UFSI_VERSION}.0 (Digital Public Good)",
        generatedAt=datetime.now(timezone.utc),
        totalFeatures=len(features),
        features=features,
    )
