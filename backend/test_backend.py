"""
Automated Test Suite for NAARIN FastAPI Backend & Google GenAI Agricultural ML Module
Covers all endpoints, schemas, services, AgriStack UFSI compliance, decision matrix,
Google GenAI (gemini-2.5-flash) multimodal diagnosis, function calling tools, and voice advisories.
"""

import io
import os
import sys
from pathlib import Path

# Add project root directory to sys.path so 'backend' package is resolvable regardless of execution CWD
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import pytest
from httpx import AsyncClient, ASGITransport
from PIL import Image

from backend.main import app
from backend.services.weather_service import weather_service
from backend.services.soil_service import soil_service
from backend.services.regenerative_engine import regenerative_engine
from backend.services.ml_engine import (
    ml_engine,
    get_soil_health_data,
    get_weather_forecast,
    get_isro_bhuvan_indices,
)
from backend.schemas.advisory_schemas import (
    NutrientRating,
    AdvisoryRequest,
    WeatherSummary,
    SoilHealthProfile,
    LocationContext,
    SeasonEnum,
    IrrigationSourceEnum,
)
from backend.schemas.ml_schemas import CropDiagnosisSchema


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
def sample_leaf_image_bytes() -> bytes:
    """Generate a clean synthetic green RGB image in memory."""
    img = Image.new("RGB", (300, 300), color=(40, 160, 40))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.mark.asyncio
async def test_root_and_health_endpoints():
    """Verify discovery root and health check endpoints."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Test Root
        root_res = await client.get("/")
        assert root_res.status_code == 200
        root_data = root_res.json()
        assert root_data["status"] == "operational"
        assert "AgriStack" in root_data["standard"]
        assert "ai_module" in root_data
        assert root_data["ai_module"]["sdk"] == "google-genai"
        assert "/api/diagnose" in root_data["endpoints"]["genai_crop_diagnose"]
        assert "/api/advisory" in root_data["endpoints"]["genai_farmer_advisory"]
        assert "/api/v1/advisory/recommend" in root_data["endpoints"]["agro_advisory_recommend"]

        # Test Health
        health_res = await client.get("/health")
        assert health_res.status_code == 200
        assert health_res.json()["status"] == "healthy"


# ============================================================================
# Google GenAI ML Module Tests (POST /api/diagnose & POST /api/advisory)
# ============================================================================

@pytest.mark.asyncio
async def test_ml_diagnose_endpoint_multipart(sample_leaf_image_bytes):
    """Verify POST /api/diagnose and /api/v1/diagnose with multipart image upload."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {
            "file": ("tomato_late_blight.jpg", sample_leaf_image_bytes, "image/jpeg")
        }
        res = await client.post("/api/diagnose", files=files)
        assert res.status_code == 200
        data = res.json()

        # Strict JSON Schema Verification
        assert "crop_name" in data
        assert "disease_detected" in data
        assert "pathogen_type" in data
        assert "confidence" in data
        assert 0.0 <= data["confidence"] <= 1.0
        assert "symptoms" in data and isinstance(data["symptoms"], list)
        assert len(data["symptoms"]) > 0
        assert "eco_friendly_remedies" in data and isinstance(data["eco_friendly_remedies"], list)
        assert len(data["eco_friendly_remedies"]) > 0
        assert "urgency" in data
        assert any(keyword in data["eco_friendly_remedies"][0].lower() for keyword in ["neem", "gomutra", "trichoderma", "spray", "jeevamrutha"])

        # Also test /api/v1/diagnose alias
        files_v1 = {
            "file": ("rice_brown_spot.jpg", sample_leaf_image_bytes, "image/jpeg")
        }
        res_v1 = await client.post("/api/v1/diagnose", files=files_v1)
        assert res_v1.status_code == 200
        assert res_v1.json()["crop_name"] != ""


@pytest.mark.asyncio
async def test_ml_diagnose_invalid_file():
    """Verify POST /api/diagnose rejects invalid non-image formats."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {
            "file": ("corrupt.txt", b"Invalid binary text not an image", "text/plain")
        }
        res = await client.post("/api/diagnose", files=files)
        assert res.status_code == 400
        assert "not a valid image format" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_ml_advisory_endpoint():
    """Verify POST /api/advisory and /api/v1/advisory with natural language query & district."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "query": "Monsoon is delayed by 3 weeks and topsoil is dry. What drought-hardy crop should I sow, and how do I enrich soil organic carbon?",
            "district": "Jaipur",
        }
        res = await client.post("/api/advisory", json=payload)
        assert res.status_code == 200
        data = res.json()

        assert "advisory" in data
        assert len(data["advisory"]) > 50
        assert data["district"] == "Jaipur"
        assert "source_model" in data
        assert "tools_invoked" in data
        assert len(data["tools_invoked"]) >= 3
        # Ensure regenerative terms are synthesized
        advisory_lower = data["advisory"].lower()
        assert any(k in advisory_lower for k in ["millet", "bajra", "jeevamrutha", "organic", "moisture", "soil"])


@pytest.mark.asyncio
async def test_ml_advisory_with_diagnosis_integration():
    """Verify POST /api/advisory seamlessly incorporates visual leaf scan diagnosis."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "query": "Leaves are turning yellow with brown spots. What biological spray can I make at home?",
            "district": "Nagpur",
            "diagnosis": {
                "crop_name": "Tomato",
                "disease_detected": "Tomato Late Blight",
                "pathogen_type": "Fungal (Oomycete)",
                "confidence": 0.96,
                "symptoms": ["Dark water-soaked lesions"],
                "eco_friendly_remedies": ["Spray Neem oil (3000 ppm) @ 5ml/L", "Apply fermented Gomutra 10%"],
                "urgency": "Immediate (within 24 hours)",
            },
        }
        res = await client.post("/api/advisory", json=payload)
        assert res.status_code == 200
        data = res.json()
        adv_text = data["advisory"]
        assert "Tomato" in adv_text or "Late Blight" in adv_text or "Neem" in adv_text or "Gomutra" in adv_text


def test_ml_tools_function_calling():
    """Directly test the Gemini function calling tool implementations."""
    # 1. Soil Health Data Tool
    shc_data = get_soil_health_data("Jaipur")
    assert shc_data["district"] == "Jaipur"
    assert shc_data["state"] == "Rajasthan"
    assert shc_data["nitrogen_rating"] in ["Low", "Medium", "High"]
    assert shc_data["organic_carbon_pct"] > 0
    assert "interpretation" in shc_data

    # 2. Weather Forecast Data Tool
    wx_data = get_weather_forecast("Nagpur")
    assert wx_data["district"] == "Nagpur"
    assert "rainfall_14d_sum_mm" in wx_data
    assert "temp_2m_max_avg_c" in wx_data
    assert "drought_risk" in wx_data
    assert "synopsis" in wx_data

    # 3. ISRO Bhuvan Satellite & Agro-Twin Tool
    isro_data = get_isro_bhuvan_indices("Bikaner")
    assert isro_data["district"] == "Bikaner"
    assert "ndvi_vegetation_index" in isro_data
    assert "shared_agro_climatic_corridor" in isro_data
    assert len(isro_data["recommended_resilient_crops"]) > 0
    assert "cross_border_intelligence" in isro_data


def test_ml_engine_direct_methods(sample_leaf_image_bytes):
    """Directly test MLEngine methods for unit-level verification."""
    # Test diagnose_crop_disease
    diag = ml_engine.diagnose_crop_disease(sample_leaf_image_bytes, "cotton_leaf_curl.jpg")
    validated = CropDiagnosisSchema(**diag)
    assert validated.crop_name != ""
    assert 0.0 <= validated.confidence <= 1.0
    assert len(validated.eco_friendly_remedies) > 0

    # Test generate_farmer_advisory
    adv = ml_engine.generate_farmer_advisory(
        user_query="How do I prepare bio-fertilizers for low nitrogen soil?",
        district="Ludhiana",
    )
    assert len(adv) > 30
    assert "Ludhiana" in adv or "Punjab" in adv


# ============================================================================
# Core Domain Engine & AgriStack Standards Tests
# ============================================================================

@pytest.mark.asyncio
async def test_advisory_recommend_arid_zone():
    """Verify crop recommendation and regenerative matrix for Western Arid Rajasthan."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "latitude": 26.9124,
            "longitude": 75.7873,
            "state": "Rajasthan",
            "district": "Jaipur",
            "current_crop": "Fallow",
            "season": "Kharif",
            "farm_size_acres": 3.0,
            "irrigation_source": "Rainfed",
        }
        res = await client.post("/api/v1/advisory/recommend", json=payload)
        assert res.status_code == 200
        data = res.json()

        # Check structure
        assert "advisory_id" in data
        assert data["advisory_id"].startswith("NAARIN-ADV-")
        assert data["location_context"]["state"] == "Rajasthan"
        assert data["soil_profile"]["organic_carbon_pct"] <= 0.50

        # Check Decision Matrix Output
        crop_names = [c["crop_name"] for c in data["recommended_crops"]]
        assert len(crop_names) >= 2
        # Under low SOC (<=0.5%) and/or dry conditions, pulse/legume or millet is recommended
        assert any(
            keyword in name
            for name in crop_names
            for keyword in ["Pigeon Pea", "Chickpea", "Cowpea", "Moong", "Pearl Millet", "Bajra", "Ragi"]
        )

        # Check Bio-fertilizers
        bio_names = [b["name"] for b in data["bio_fertilizers"]]
        assert any("Jeevamrutha" in b for b in bio_names)
        assert any("Rhizobium" in b or "Azotobacter" in b for b in bio_names)

        # Check Soil Restoration Score
        score = data["soil_restoration_score"]
        assert 0 <= score["total_score"] <= 100
        assert "resilience_grade" in score

        # Check environmental metrics
        assert data["carbon_sequestration_potential_kg_ha_yr"] > 0
        assert data["water_savings_potential_pct"] >= 15.0


@pytest.mark.asyncio
async def test_advisory_recommend_with_custom_soil_override():
    """Verify custom Soil Health Card input override behavior."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "latitude": 21.1458,
            "longitude": 79.0882,
            "season": "Rabi",
            "soil_override": {
                "nitrogen_kg_ha": 150.0,
                "phosphorus_kg_ha": 8.0,
                "potassium_kg_ha": 290.0,
                "organic_carbon_pct": 0.32,
                "ph": 7.8,
                "soil_type": "Custom Black Cotton Clay",
            },
        }
        res = await client.post("/api/v1/advisory/recommend", json=payload)
        assert res.status_code == 200
        data = res.json()

        assert data["soil_profile"]["is_custom_override"] is True
        assert data["soil_profile"]["nitrogen_kg_ha"] == 150.0
        assert data["soil_profile"]["nitrogen_rating"] == "Low"
        assert data["soil_profile"]["phosphorus_rating"] == "Low"
        assert data["soil_profile"]["potassium_rating"] == "High"
        assert data["soil_profile"]["soil_type"] == "Custom Black Cotton Clay"

        # Under low SOC (<0.5%) and low N, legumes should be strongly prioritized
        crop_names = [c["crop_name"] for c in data["recommended_crops"]]
        assert any("Gram" in name or "Pea" in name or "Moong" in name or "Cowpea" in name for name in crop_names)


def test_regenerative_engine_decision_matrix_drought_and_low_soc():
    """Test decision matrix: Low SOC (<0.5%) + Low N + Drought (<30mm rainfall) -> Pearl Millet & Pigeon Pea."""
    req = AdvisoryRequest(
        latitude=26.9124,
        longitude=75.7873,
        season=SeasonEnum.KHARIF,
    )
    weather = WeatherSummary(
        rainfall_14d_sum_mm=12.0,  # < 30mm
        temp_2m_max_avg_c=39.0,
        temp_2m_min_avg_c=27.0,
        topsoil_moisture_avg_m3m3=0.12,
        drought_risk=True,
        heatwave_risk=True,
        forecast_source="Test Mock",
    )
    soil = SoilHealthProfile(
        zone_name="Arid Zone",
        soil_type="Desert Sandy Loam",
        nitrogen_kg_ha=180.0,
        nitrogen_rating=NutrientRating.LOW,
        phosphorus_kg_ha=12.0,
        phosphorus_rating=NutrientRating.MEDIUM,
        potassium_kg_ha=290.0,
        potassium_rating=NutrientRating.HIGH,
        organic_carbon_pct=0.35,  # < 0.50%
        ph=8.2,
        electrical_conductivity_dsm=0.45,
        soil_health_card_id="SHC-TEST-001",
    )
    location = LocationContext(
        latitude=26.9124,
        longitude=75.7873,
        state="Rajasthan",
        district="Jaipur",
        agro_climatic_zone="Western Arid",
    )

    advisory = regenerative_engine.generate_advisory(req, weather, soil, location)
    crop_names = [c.crop_name for c in advisory.recommended_crops]

    # Must recommend both drought millets and nitrogen-fixing legumes
    assert any("Pearl Millet" in c or "Bajra" in c for c in crop_names)
    assert any("Pigeon Pea" in c or "Arhar" in c for c in crop_names)
    assert any("Jeevamrutha" in b.name for b in advisory.bio_fertilizers)
    assert advisory.soil_restoration_score.total_score >= 0


def test_regenerative_engine_decision_matrix_drought_only():
    """Test decision matrix: Drought (<30mm rainfall) -> Millets (Sorghum / Pearl Millet)."""
    req = AdvisoryRequest(
        latitude=19.8762,
        longitude=75.3433,
        season=SeasonEnum.KHARIF,
    )
    weather = WeatherSummary(
        rainfall_14d_sum_mm=18.0,  # < 30mm
        temp_2m_max_avg_c=34.0,
        temp_2m_min_avg_c=22.0,
        topsoil_moisture_avg_m3m3=0.15,
        drought_risk=True,
        heatwave_risk=False,
        forecast_source="Test Mock",
    )
    soil = SoilHealthProfile(
        zone_name="Maharashtra Scarcity Zone",
        soil_type="Medium Black Soil",
        nitrogen_kg_ha=320.0,
        nitrogen_rating=NutrientRating.MEDIUM,
        phosphorus_kg_ha=18.0,
        phosphorus_rating=NutrientRating.MEDIUM,
        potassium_kg_ha=300.0,
        potassium_rating=NutrientRating.HIGH,
        organic_carbon_pct=0.65,  # Moderate SOC
        ph=7.8,
        electrical_conductivity_dsm=0.35,
        soil_health_card_id="SHC-TEST-002",
    )
    location = LocationContext(
        latitude=19.8762,
        longitude=75.3433,
        state="Maharashtra",
        district="Aurangabad",
        agro_climatic_zone="Western Plateau",
    )

    advisory = regenerative_engine.generate_advisory(req, weather, soil, location)
    crop_names = [c.crop_name for c in advisory.recommended_crops]

    assert any("Sorghum" in c or "Jowar" in c or "Pearl Millet" in c for c in crop_names)


@pytest.mark.asyncio
async def test_agristack_ufsi_feature_collection():
    """Verify AgriStack UFSI JSON-LD and GeoJSON standards compliance."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/agristack/ufsi/v1/advisories?limit=5")
        assert res.status_code == 200
        data = res.json()

        # Check JSON-LD Context and GeoJSON root
        assert data["@context"] == "https://agristack.gov.in/contexts/v1/advisory.jsonld"
        assert data["type"] == "FeatureCollection"
        assert "AgriStack UFSI" in data["standard"]
        assert len(data["features"]) > 0

        # Check Feature Schema
        feat = data["features"][0]
        assert feat["type"] == "Feature"
        assert feat["geometry"]["type"] == "Point"
        assert len(feat["geometry"]["coordinates"]) == 2

        props = feat["properties"]
        assert props["@type"] == "AgroAdvisory"
        assert "advisoryId" in props
        assert "farmerZoneCode" in props
        assert "soilHealthIndex" in props
        assert "recommendedIntervention" in props
        assert "regenerativeCompliance" in props


@pytest.mark.asyncio
async def test_federation_sync_twins():
    """Verify inter-state agro-climatic digital twin model federation."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "source_node_id": "RJ-Arid-Zone-04",
            "target_node_id": "GJ-Arid-Zone-02",
            "model_family": "CropYield_Regenerative_v3",
            "round_number": 14,
            "local_loss": 0.0418,
            "sample_count": 12500,
        }
        res = await client.post("/api/v1/federation/sync-twins", json=payload)
        assert res.status_code == 200
        data = res.json()

        assert data["source_node_id"] == "RJ-Arid-Zone-04"
        assert data["target_node_id"] == "GJ-Arid-Zone-02"
        assert data["agro_climatic_similarity_score"] >= 0.80
        assert data["aggregated_model_version"] == "CropYield_Regenerative_v3-FL-v14"
        assert data["consensus_weights_hash"].startswith("sha256:")
        assert "Zero PII" in data["privacy_guarantee"]
        assert len(data["shared_agro_insights"]) >= 3


def test_soil_service_ratings():
    """Direct unit tests for Soil Health Card nutrient classification."""
    assert soil_service.rate_nitrogen(150.0) == NutrientRating.LOW
    assert soil_service.rate_nitrogen(350.0) == NutrientRating.MEDIUM
    assert soil_service.rate_nitrogen(600.0) == NutrientRating.HIGH

    assert soil_service.rate_phosphorus(8.0) == NutrientRating.LOW
    assert soil_service.rate_phosphorus(18.0) == NutrientRating.MEDIUM
    assert soil_service.rate_phosphorus(32.0) == NutrientRating.HIGH

    assert soil_service.rate_potassium(90.0) == NutrientRating.LOW
    assert soil_service.rate_potassium(200.0) == NutrientRating.MEDIUM
    assert soil_service.rate_potassium(350.0) == NutrientRating.HIGH


def test_weather_service_offline_fallback():
    """Direct unit test for offline synthetic weather generation."""
    # Rajasthan centroid
    fallback_rj = weather_service._generate_fallback_forecast(26.9124, 75.7873)
    assert fallback_rj.rainfall_14d_sum_mm < 30.0
    assert fallback_rj.drought_risk is True
    assert "Fallback" in fallback_rj.forecast_source

    # Punjab centroid
    fallback_pb = weather_service._generate_fallback_forecast(30.9010, 75.8573)
    assert fallback_pb.rainfall_14d_sum_mm >= 30.0


if __name__ == "__main__":
    sys.exit(pytest.main(["-v", __file__]))
