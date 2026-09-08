from typing import List
from backend.schemas.soil_schemas import SoilEvaluationReport
from backend.schemas.climate_schemas import WeatherTelemetry
from backend.schemas.advisory_schemas import (
    CropRecommendation,
    RegenerativeAdvisoryResponse
)
from backend.schemas.common import AgroClimaticZoneInfo

def generate_regenerative_advisory(
    soil_report: SoilEvaluationReport,
    climate: WeatherTelemetry,
    zone: AgroClimaticZoneInfo,
    season: str = "Kharif"
) -> RegenerativeAdvisoryResponse:
    recommendations: List[CropRecommendation] = []
    bio_fertilizers: List[str] = []

    # 1. Monoculture Interruption & Climate Resilience Logic
    if climate.drought_risk_index in ["MODERATE", "SEVERE"] or climate.rainfall_14d_sum_mm < 60:
        recommendations.append(
            CropRecommendation(
                crop_name="Pearl Millet (Bajra) / Finger Millet (Ragi)",
                crop_category="Millet",
                rationale="Exceptional drought tolerance, minimal water requirement, and resilient to erratic monsoons.",
                water_requirement="Low / Rainfed"
            )
        )
    else:
        recommendations.append(
            CropRecommendation(
                crop_name="Sorghum (Jowar) / Proso Millet",
                crop_category="Millet",
                rationale="C4 photosynthetic efficiency, deep root system extracting nutrients without chemical forcing.",
                water_requirement="Medium"
            )
        )

    # 2. Legume Biological Fixation (Addresses Low SOC & Nitrogen without heavy Urea)
    if soil_report.organic_carbon_status.value == "LOW" or soil_report.nitrogen_status.value == "LOW":
        recommendations.append(
            CropRecommendation(
                crop_name="Pigeon Pea (Arhar/Tur) / Green Gram (Moong)",
                crop_category="Pulse",
                rationale="Intercropped legume fixes atmospheric nitrogen via root nodules, restoring soil organic carbon.",
                water_requirement="Low"
            )
        )
        bio_fertilizers.append("Rhizobium culture seed treatment (200g/10kg seed) before sowing to maximize nodulation.")

    # 3. Green Manuring & Organic Matter Rebuilding
    if soil_report.soil_restoration_score < 60:
        recommendations.append(
            CropRecommendation(
                crop_name="Sunn Hemp (Sanai) / Dhaincha",
                crop_category="Green Manure",
                rationale="Fast biomass producer; incorporated at 45 days to add 15-20 tonnes/ha of green organic matter.",
                water_requirement="Rainfed"
            )
        )
        bio_fertilizers.append("Jeevamrutha fermented microbial application (200L/acre with irrigation) to trigger native soil biology.")

    # 4. Target Specific Deficiencies (e.g. Zinc, Phosphorus)
    if soil_report.is_zinc_deficient:
        bio_fertilizers.append("Zinc Solubilizing Bacteria (ZSB) bio-fertilizer foliar application or organic compost enrichment.")

    if soil_report.phosphorus_status.value == "LOW":
        bio_fertilizers.append("Phosphate Solubilizing Bacteria (PSB) with farmyard manure.")

    # 5. Localized Plain-Language Voice Summary
    summary = (
        f"For your field in {zone.zone_name}, soil restoration score is {soil_report.soil_restoration_score}/100. "
        f"Due to low organic carbon and weather forecasts, rotate out of continuous monoculture into "
        f"{recommendations[0].crop_name} intercropped with {recommendations[1].crop_name if len(recommendations) > 1 else 'pulses'}. "
        f"Apply microbial bio-fertilizers instead of chemical dumping."
    )

    return RegenerativeAdvisoryResponse(
        agro_climatic_zone=zone,
        current_season=season,
        soil_restoration_score=soil_report.soil_restoration_score,
        recommended_rotations=recommendations,
        bio_fertilizer_schedule=bio_fertilizers,
        actionable_summary=summary,
        audio_base64=None
    )
