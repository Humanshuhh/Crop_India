"""
Regenerative Agronomy Decision Engine
Decision matrix & scoring algorithms for sustainable, climate-resilient crop recommendations.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Tuple, Dict, Any
from backend.schemas.advisory_schemas import (
    AdvisoryRequest,
    AdvisoryResponse,
    CropRecommendation,
    BioFertilizerRecommendation,
    RegenerativePractice,
    SoilRestorationScore,
    WeatherSummary,
    SoilHealthProfile,
    NutrientRating,
    SeasonEnum,
    LocationContext,
)


class RegenerativeEngine:
    """Intelligent agronomy recommendation and soil restoration scoring engine."""

    def generate_advisory(
        self,
        request: AdvisoryRequest,
        weather: WeatherSummary,
        soil: SoilHealthProfile,
        location: LocationContext,
    ) -> AdvisoryResponse:
        """Process farm telemetry, weather forecasts, and soil health to produce a comprehensive advisory."""
        advisory_id = f"NAARIN-ADV-{uuid.uuid4().hex[:8].upper()}"

        # 1. Determine recommended crops based on decision matrix
        recommended_crops, rotation_plan = self._recommend_crops_and_rotation(
            request=request,
            weather=weather,
            soil=soil,
        )

        # 2. Generate customized bio-fertilizer schedule
        bio_fertilizers = self._generate_bio_fertilizers(soil=soil, recommended_crops=recommended_crops)

        # 3. Generate regenerative farming practices
        regenerative_practices = self._generate_regenerative_practices(
            weather=weather, soil=soil, request=request
        )

        # 4. Calculate Soil Restoration Score (0-100)
        restoration_score = self._calculate_restoration_score(soil=soil, practices=regenerative_practices)

        # 5. Compile risk advisories
        risk_advisories = self._generate_risk_advisories(weather=weather, soil=soil)

        # 6. Environmental impact estimations
        carbon_sequestration = self._estimate_carbon_sequestration(soil=soil, practices=regenerative_practices)
        water_savings_pct = self._estimate_water_savings(weather=weather, practices=regenerative_practices)

        return AdvisoryResponse(
            advisory_id=advisory_id,
            location_context=location,
            weather_summary=weather,
            soil_profile=soil,
            recommended_crops=recommended_crops,
            crop_rotation_plan=rotation_plan,
            bio_fertilizers=bio_fertilizers,
            regenerative_practices=regenerative_practices,
            soil_restoration_score=restoration_score,
            risk_advisories=risk_advisories,
            carbon_sequestration_potential_kg_ha_yr=carbon_sequestration,
            water_savings_potential_pct=water_savings_pct,
            generated_at=datetime.now(timezone.utc),
        )

    def _recommend_crops_and_rotation(
        self,
        request: AdvisoryRequest,
        weather: WeatherSummary,
        soil: SoilHealthProfile,
    ) -> Tuple[List[CropRecommendation], List[str]]:
        """
        Decision Matrix:
        - If SOC < 0.5% & Low Nitrogen -> Prioritize nitrogen-fixing legume intercrops (Pigeon Pea, Chickpea, Cowpea)
        - If 14-day rainfall < 30mm -> Prioritize drought-hardy millets (Pearl Millet, Sorghum, Ragi)
        - Else optimal staple/cash rotation with green manure cover
        """
        crops: List[CropRecommendation] = []
        rotation: List[str] = []

        is_drought_stress = weather.rainfall_14d_sum_mm < 30.0 or weather.drought_risk
        is_low_soc_and_n = soil.organic_carbon_pct < 0.50 and soil.nitrogen_rating == NutrientRating.LOW

        # Scenario 1: Severe dryland / Low Rainfall -> Drought hardy millets with legume intercrop
        if is_drought_stress and is_low_soc_and_n:
            crops.append(
                CropRecommendation(
                    crop_name="Pearl Millet (Bajra)",
                    scientific_name="Pennisetum glaucum",
                    variety_recommendation="GHB-538 / HHB-67 Improved (Early maturing 65-70 days)",
                    suitability_score=96,
                    reasoning=(
                        f"14-day rainfall is critically low ({weather.rainfall_14d_sum_mm}mm) and SOC is {soil.organic_carbon_pct}%. "
                        "Bajra thrives in high-heat arid soils with minimal water consumption (250-350mm total lifecycle)."
                    ),
                    water_requirement="Very Low (250-350 mm)",
                    growth_duration_days=70,
                    expected_yield_quintals_per_acre=12.5,
                    estimated_profit_per_acre_inr=18500.0,
                    is_nitrogen_fixer=False,
                    is_drought_tolerant=True,
                )
            )
            crops.append(
                CropRecommendation(
                    crop_name="Pigeon Pea (Arhar / Tur) - Intercrop",
                    scientific_name="Cajanus cajan",
                    variety_recommendation="ICPL-87 (Prabhat) / BDN-711",
                    suitability_score=92,
                    reasoning=(
                        "Intercropping with Pigeon Pea fixes 40-70 kg atmospheric Nitrogen/ha, rejuvenating depleted "
                        f"soil (current N: {soil.nitrogen_kg_ha} kg/ha) while providing drought-tolerant deep taproot moisture access."
                    ),
                    water_requirement="Low (350-450 mm)",
                    growth_duration_days=120,
                    expected_yield_quintals_per_acre=6.8,
                    estimated_profit_per_acre_inr=24000.0,
                    is_nitrogen_fixer=True,
                    is_drought_tolerant=True,
                )
            )
            crops.append(
                CropRecommendation(
                    crop_name="Finger Millet (Ragi)",
                    scientific_name="Eleusine coracana",
                    variety_recommendation="GPU-28 / ML-365",
                    suitability_score=88,
                    reasoning="Outstanding climate resilience, rich in calcium/minerals, highly responsive to Jeevamrutha organic treatment.",
                    water_requirement="Low (300-400 mm)",
                    growth_duration_days=95,
                    expected_yield_quintals_per_acre=10.0,
                    estimated_profit_per_acre_inr=21000.0,
                    is_nitrogen_fixer=False,
                    is_drought_tolerant=True,
                )
            )
            rotation = [
                "Kharif (Current): Pearl Millet + Pigeon Pea (4:1 strip intercropping)",
                "Rabi: Chickpea (Desi Gram) / Mustard under residual soil moisture",
                "Zaid / Summer: Cowpea green manure cover crop incorporated at 45 days",
            ]

        # Scenario 2: Low SOC & Low N, but Moderate/Good rainfall -> Heavy Nitrogen Fixers & Pulses
        elif is_low_soc_and_n:
            crops.append(
                CropRecommendation(
                    crop_name="Chickpea (Desi / Kabuli Gram)",
                    scientific_name="Cicer arietinum",
                    variety_recommendation="JG-11 / JAKI-9218 / Pusa-372",
                    suitability_score=95,
                    reasoning=(
                        f"Soil Organic Carbon is deficient at {soil.organic_carbon_pct}%. Chickpea nodulation aggressively "
                        "restores soil microbial vitality and bio-available nitrogen without costly synthetic urea."
                    ),
                    water_requirement="Low to Moderate (300-400 mm)",
                    growth_duration_days=105,
                    expected_yield_quintals_per_acre=8.5,
                    estimated_profit_per_acre_inr=26500.0,
                    is_nitrogen_fixer=True,
                    is_drought_tolerant=True,
                )
            )
            crops.append(
                CropRecommendation(
                    crop_name="Green Gram (Moong)",
                    scientific_name="Vigna radiata",
                    variety_recommendation="IPM 02-3 / SAMRAT / Virat",
                    suitability_score=91,
                    reasoning="Rapid 60-day lifecycle, adds up to 35 kg N/ha, leaves extensive biomass for soil carbon building.",
                    water_requirement="Low (250-300 mm)",
                    growth_duration_days=60,
                    expected_yield_quintals_per_acre=5.5,
                    estimated_profit_per_acre_inr=22000.0,
                    is_nitrogen_fixer=True,
                    is_drought_tolerant=False,
                )
            )
            crops.append(
                CropRecommendation(
                    crop_name="Cowpea (Lobia / Chawli)",
                    scientific_name="Vigna unguiculata",
                    variety_recommendation="Pusa Komal / CP-4",
                    suitability_score=87,
                    reasoning="Dual-purpose pulse and high-biomass cover crop preventing topsoil erosion and fixing nitrogen.",
                    water_requirement="Low (300-350 mm)",
                    growth_duration_days=75,
                    expected_yield_quintals_per_acre=7.0,
                    estimated_profit_per_acre_inr=19000.0,
                    is_nitrogen_fixer=True,
                    is_drought_tolerant=True,
                )
            )
            rotation = [
                "Kharif (Current): Green Gram / Cowpea pulse rotation with border Maize",
                "Rabi: Wheat / Mustard with bio-fertilizer seed coating",
                "Zaid: Sesbania (Dhaincha) green manure incorporation",
            ]

        # Scenario 3: Drought stress with moderate SOC
        elif is_drought_stress:
            crops.append(
                CropRecommendation(
                    crop_name="Sorghum (Jowar)",
                    scientific_name="Sorghum bicolor",
                    variety_recommendation="CSH-16 / CSV-27",
                    suitability_score=94,
                    reasoning=f"14-day rainfall is low ({weather.rainfall_14d_sum_mm}mm). Sorghum has high water-use efficiency and stay-green drought tolerance.",
                    water_requirement="Low to Moderate (350-450 mm)",
                    growth_duration_days=105,
                    expected_yield_quintals_per_acre=14.0,
                    estimated_profit_per_acre_inr=20500.0,
                    is_nitrogen_fixer=False,
                    is_drought_tolerant=True,
                )
            )
            crops.append(
                CropRecommendation(
                    crop_name="Pearl Millet (Bajra)",
                    scientific_name="Pennisetum glaucum",
                    variety_recommendation="HHB-67 / Pioneer 86M88",
                    suitability_score=90,
                    reasoning="Rapid grain filling under terminal moisture stress, high fodder market value.",
                    water_requirement="Very Low (250-350 mm)",
                    growth_duration_days=72,
                    expected_yield_quintals_per_acre=11.5,
                    estimated_profit_per_acre_inr=17000.0,
                    is_nitrogen_fixer=False,
                    is_drought_tolerant=True,
                )
            )
            crops.append(
                CropRecommendation(
                    crop_name="Cluster Bean (Guar)",
                    scientific_name="Cyamopsis tetragonoloba",
                    variety_recommendation="RGC-936 / HG-365",
                    suitability_score=86,
                    reasoning="Deep-root legume adapted to semi-arid tracts, excellent gum industrial demand.",
                    water_requirement="Very Low (200-300 mm)",
                    growth_duration_days=90,
                    expected_yield_quintals_per_acre=6.0,
                    estimated_profit_per_acre_inr=23000.0,
                    is_nitrogen_fixer=True,
                    is_drought_tolerant=True,
                )
            )
            rotation = [
                "Kharif (Current): Sorghum + Cluster Bean intercrop",
                "Rabi: Safflower / Barley requiring minimal irrigation",
                "Zaid: Fallow with stubble mulching",
            ]

        # Scenario 4: Favorable Soil & Favorable Weather -> High-Value Regenerative Cereals & Pulses
        else:
            crops.append(
                CropRecommendation(
                    crop_name="Paddy (System of Rice Intensification - SRI)",
                    scientific_name="Oryza sativa",
                    variety_recommendation="MTU-1010 / Pusa Basmati 1509",
                    suitability_score=93,
                    reasoning=f"Adequate moisture ({weather.topsoil_moisture_avg_m3m3} m3/m3) and healthy soil matrix. SRI methodology saves 40% water and reduces methane emissions.",
                    water_requirement="High (900-1100 mm under SRI vs 1800mm flood)",
                    growth_duration_days=120,
                    expected_yield_quintals_per_acre=24.0,
                    estimated_profit_per_acre_inr=32000.0,
                    is_nitrogen_fixer=False,
                    is_drought_tolerant=False,
                )
            )
            crops.append(
                CropRecommendation(
                    crop_name="Soybean (Broad Bed Furrow)",
                    scientific_name="Glycine max",
                    variety_recommendation="JS-335 / NRC-37",
                    suitability_score=89,
                    reasoning="High oil and protein yield, excellent symbiotic N-fixation, ideal for black & alluvial soils.",
                    water_requirement="Moderate (450-550 mm)",
                    growth_duration_days=95,
                    expected_yield_quintals_per_acre=10.5,
                    estimated_profit_per_acre_inr=25000.0,
                    is_nitrogen_fixer=True,
                    is_drought_tolerant=False,
                )
            )
            crops.append(
                CropRecommendation(
                    crop_name="Maize (Composite / Hybrid)",
                    scientific_name="Zea mays",
                    variety_recommendation="DKC-9108 / Pusa HM-9",
                    suitability_score=85,
                    reasoning="High grain & silage yield, highly responsive to bio-fertilizer inoculants.",
                    water_requirement="Moderate (500-600 mm)",
                    growth_duration_days=100,
                    expected_yield_quintals_per_acre=22.0,
                    estimated_profit_per_acre_inr=27000.0,
                    is_nitrogen_fixer=False,
                    is_drought_tolerant=False,
                )
            )
            rotation = [
                "Kharif (Current): Soybean / Rice (SRI) with biochar application",
                "Rabi: Wheat / Mustard / Chickpea crop cycle",
                "Zaid: Moong green crop incorporated before monsoon",
            ]

        return crops, rotation

    def _generate_bio_fertilizers(
        self,
        soil: SoilHealthProfile,
        recommended_crops: List[CropRecommendation],
    ) -> List[BioFertilizerRecommendation]:
        """Formulate tailored microbial and bio-fertilizer schedule."""
        bio_list: List[BioFertilizerRecommendation] = [
            BioFertilizerRecommendation(
                name="Jeevamrutha (Fermented Microbial Culture)",
                category="Liquid Bio-Enhancer & Soil Probiotic",
                dosage="200 Litres / acre via irrigation water or spray",
                application_stage="Every 15-21 days throughout vegetative growth",
                targeted_benefit="Multiplies beneficial indigenous soil bacteria and mycorrhizae, unlocks bound phosphorus.",
            )
        ]

        has_legume = any(c.is_nitrogen_fixer for c in recommended_crops)

        if has_legume or soil.nitrogen_rating == NutrientRating.LOW:
            bio_list.append(
                BioFertilizerRecommendation(
                    name="Rhizobium Legume Culture",
                    category="Symbiotic Nitrogen Fixer",
                    dosage="250g / 10kg seed (Seed Inoculation Slurry)",
                    application_stage="Seed treatment before sowing (dry in shade for 30 mins)",
                    targeted_benefit="Fixes 50-80 kg atmospheric nitrogen per hectare directly into root nodules.",
                )
            )

        if not has_legume and soil.nitrogen_rating != NutrientRating.HIGH:
            bio_list.append(
                BioFertilizerRecommendation(
                    name="Azotobacter / Azospirillum Culture",
                    category="Free-Living Nitrogen Fixer",
                    dosage="1 Litre / acre or 500g carrier powder",
                    application_stage="Basal soil application mixed with 100kg FYM / vermicompost",
                    targeted_benefit="Provides 20-30 kg N/ha, secretes auxin and gibberellin growth hormones.",
                )
            )

        if soil.phosphorus_rating == NutrientRating.LOW or soil.phosphorus_rating == NutrientRating.MEDIUM:
            bio_list.append(
                BioFertilizerRecommendation(
                    name="Phosphate Solubilizing Bacteria (PSB / Bacillus megaterium)",
                    category="Phosphorus Mobilizer",
                    dosage="1 Litre / acre mixed with compost",
                    application_stage="At the time of final land preparation",
                    targeted_benefit="Solubilizes fixed insoluble tricalcium phosphates in alkaline/acidic soils.",
                )
            )

        bio_list.append(
            BioFertilizerRecommendation(
                name="Trichoderma viride (Bio-Fungicide / Root Colonizer)",
                category="Biocontrol Agent",
                dosage="2.5 kg / acre with 250 kg decomposed manure",
                application_stage="Basal incorporation 7 days prior to sowing",
                targeted_benefit="Protects against root rot, wilt, collar rot, and stimulates systemic acquired resistance (SAR).",
            )
        )

        return bio_list

    def _generate_regenerative_practices(
        self,
        weather: WeatherSummary,
        soil: SoilHealthProfile,
        request: AdvisoryRequest,
    ) -> List[RegenerativePractice]:
        """Suggest farm-specific regenerative soil practices."""
        practices: List[RegenerativePractice] = []

        if weather.rainfall_14d_sum_mm < 35.0 or weather.drought_risk:
            practices.append(
                RegenerativePractice(
                    title="Live Crop Residue & Biomass Mulching",
                    description=(
                        "Cover 70% of inter-row soil with crop stubble or dry straw (3-5 tons/ha). "
                        "Reduces soil evaporation by 35%, lowers root-zone temperature by 4°C, and feeds earthworms."
                    ),
                    priority="High",
                    expected_co2_sequestration_kg_acre=450.0,
                    water_conservation_impact="Saves 25-35% irrigation requirement",
                )
            )
            practices.append(
                RegenerativePractice(
                    title="Ridge and Furrow / Broad Bed Furrow (BBF) Planting",
                    description="Shape land into beds and furrows to maximize in-situ rainwater harvesting during sporadic showers.",
                    priority="High",
                    expected_co2_sequestration_kg_acre=180.0,
                    water_conservation_impact="Increases moisture retention by 20 days",
                )
            )

        if soil.organic_carbon_pct < 0.55:
            practices.append(
                RegenerativePractice(
                    title="Green Manuring with Sesbania (Dhaincha) or Sunnhemp",
                    description=(
                        "Sow Dhaincha/Sunnhemp and incorporate into soil at 45-50 days before flowering. "
                        "Adds 15-20 tonnes/ha fresh green biomass, raising SOC by 0.10-0.15% in one season."
                    ),
                    priority="High",
                    expected_co2_sequestration_kg_acre=750.0,
                    water_conservation_impact="Improves soil water-holding capacity by 18%",
                )
            )

        practices.append(
            RegenerativePractice(
                title="Zero / Minimum Tillage with Direct Seed Drills",
                description="Avoid deep disc plowing to protect fungal mycorrhizal hyphae networks and prevent organic carbon oxidation into CO2.",
                priority="Medium",
                expected_co2_sequestration_kg_acre=320.0,
                water_conservation_impact="Preserves capillary soil moisture",
            )
        )

        practices.append(
            RegenerativePractice(
                title="Biochar & Compost Synergy Inoculation",
                description="Apply 500 kg/acre pyrolyzed agricultural biochar pre-charged with Jeevamrutha to create permanent carbon sinks.",
                priority="Recommended",
                expected_co2_sequestration_kg_acre=1200.0,
                water_conservation_impact="Enhances cation exchange capacity & moisture buffer",
            )
        )

        return practices

    def _calculate_restoration_score(
        self,
        soil: SoilHealthProfile,
        practices: List[RegenerativePractice],
    ) -> SoilRestorationScore:
        """Compute composite 0-100 Soil Restoration Index."""
        # 1. Organic matter score (0-35)
        soc = soil.organic_carbon_pct
        if soc >= 0.80:
            om_score = 35
        elif soc >= 0.60:
            om_score = int(25 + (soc - 0.60) / 0.20 * 10)
        elif soc >= 0.40:
            om_score = int(15 + (soc - 0.40) / 0.20 * 10)
        else:
            om_score = max(5, int(soc / 0.40 * 15))

        # 2. Nutrient balance score (0-35)
        n_points = 12 if soil.nitrogen_rating == NutrientRating.MEDIUM else (8 if soil.nitrogen_rating == NutrientRating.HIGH else 6)
        p_points = 11 if soil.phosphorus_rating == NutrientRating.MEDIUM else 8
        k_points = 12 if soil.potassium_rating == NutrientRating.MEDIUM else 9
        ph_penalty = 0 if (6.5 <= soil.ph <= 7.8) else (4 if (6.0 <= soil.ph <= 8.3) else 8)
        nutr_score = max(5, (n_points + p_points + k_points) - ph_penalty)

        # 3. Biological activity & regenerative adoption score (0-30)
        practice_count = len(practices)
        bio_score = min(30, practice_count * 7 + (8 if soc > 0.5 else 4))

        total = min(100, om_score + nutr_score + bio_score)

        if total >= 85:
            grade = "A+ (Regenerative Champion)"
        elif total >= 70:
            grade = "A (Active Soil Building)"
        elif total >= 55:
            grade = "B (Moderate Transition)"
        else:
            grade = "C (Degraded - Urgent Regeneration Needed)"

        return SoilRestorationScore(
            total_score=total,
            organic_matter_score=om_score,
            nutrient_balance_score=nutr_score,
            biological_activity_score=bio_score,
            resilience_grade=grade,
        )

    def _generate_risk_advisories(
        self,
        weather: WeatherSummary,
        soil: SoilHealthProfile,
    ) -> List[str]:
        """Identify critical agro-climatic vulnerabilities."""
        risks: List[str] = []

        if weather.heatwave_risk:
            risks.append(
                f"HEATWAVE WARNING: Forecast maximum temperature is {weather.temp_2m_max_avg_c}°C. "
                "Apply light evening irrigation and ensure 70% straw mulching to prevent seedling scorching."
            )

        if weather.drought_risk:
            risks.append(
                f"MOISTURE STRESS: 14-day cumulative rainfall is {weather.rainfall_14d_sum_mm}mm (below 30mm threshold). "
                "Delay high water requirement crops; implement ridge & furrow sowing immediately."
            )

        if soil.organic_carbon_pct < 0.45:
            risks.append(
                f"LOW ORGANIC CARBON ALERT ({soil.organic_carbon_pct}%): High susceptibility to soil crusting and fertilizer runoff. "
                "Mandatory application of Jeevamrutha and legume green manuring recommended."
            )

        if soil.ph > 8.0:
            risks.append(
                f"ALKALINE SOIL (pH {soil.ph}): Zinc and Phosphorus availability is restricted. "
                "Use PSB microbial bio-fertilizers and apply Gypsum / elemental sulphur if necessary."
            )
        elif soil.ph < 6.0:
            risks.append(
                f"ACIDIC SOIL (pH {soil.ph}): Aluminium toxicity risk. Apply agricultural lime (dolomite) @ 500 kg/ha."
            )

        if not risks:
            risks.append("Optimal agro-climatic window detected for Kharif/Rabi regenerative sowing.")

        return risks

    @staticmethod
    def _estimate_carbon_sequestration(
        soil: SoilHealthProfile,
        practices: List[RegenerativePractice],
    ) -> float:
        """Estimate cumulative CO2 equivalent sequestered in kg/ha/year."""
        base_kg = sum(p.expected_co2_sequestration_kg_acre for p in practices) * 2.471  # acre to ha
        return round(base_kg, 1)

    @staticmethod
    def _estimate_water_savings(
        weather: WeatherSummary,
        practices: List[RegenerativePractice],
    ) -> float:
        """Estimate irrigation water conservation percentage."""
        has_mulch = any("Mulch" in p.title for p in practices)
        has_tillage = any("Tillage" in p.title for p in practices)
        savings = 15.0
        if has_mulch:
            savings += 18.0
        if has_tillage:
            savings += 7.0
        return min(48.0, round(savings, 1))


regenerative_engine = RegenerativeEngine()
