# backend/database/firestore_crud.py

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union

from backend.database.firebase import get_firestore_db
from backend.schemas.diagnosis_schemas import CropDiagnosisResponse
from backend.schemas.Farmer_schemas import FarmerSchema
from backend.schemas.soil_schemas import RegenerativeActionPlan, SoilHealthCardInput
from backend.schemas.warning_schemas import EarlyWarningAdvisory

logger = logging.getLogger("kisan_sahayak.firestore")


def save_farmer_profile(farmer_data: FarmerSchema) -> bool:
    """Saves or updates the main farmer profile in Firestore."""
    db = get_firestore_db()
    if not db:
        return False

    try:
        db.collection("farmers").document(farmer_data.farmer_id).set(
            farmer_data.model_dump(), merge=True
        )
        return True
    except Exception as e:
        logger.error(f"Error saving farmer profile: {e}")
        return False


def get_registered_farmers() -> List[Dict[str, Any]]:
    """Retrieves all registered farmer profiles for telemetry and background scans."""
    db = get_firestore_db()
    if not db:
        return []

    try:
        docs = db.collection("farmers").stream()
        return [{"farmer_id": doc.id, **doc.to_dict()} for doc in docs]
    except Exception as e:
        logger.error(f"Error fetching registered farmers: {e}")
        return []


def save_soil_record(
    farmer_id: str,
    record_id: str,
    soil_input: SoilHealthCardInput,
    plan: RegenerativeActionPlan,
) -> bool:
    """Combines soil metrics and the AI action plan into one Firestore document."""
    db = get_firestore_db()
    if not db:
        return False

    document_data = {
        "farmer_id": farmer_id,
        "record_id": record_id,
        "raw_metrics": soil_input.model_dump(),
        "regenerative_plan": plan.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        db.collection("soil_health_records").document(record_id).set(document_data)
        return True
    except Exception as e:
        logger.error(f"Error saving soil record: {e}")
        return False


def save_leaf_diagnostic(
    farmer_id: str,
    diagnostic_id: str,
    diagnosis: CropDiagnosisResponse,
) -> bool:
    """Saves the vision model's output and eco-friendly remedies."""
    db = get_firestore_db()
    if not db:
        return False

    document_data = {
        "farmer_id": farmer_id,
        "diagnostic_id": diagnostic_id,
        "diagnosis_result": diagnosis.model_dump(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    try:
        db.collection("leaf_diagnostics").document(diagnostic_id).set(document_data)
        return True
    except Exception as e:
        logger.error(f"Error saving leaf diagnostic: {e}")
        return False


def save_early_warning_firestore(
    warning_id: str,
    farmer_id: str,
    latitude: float,
    longitude: float,
    zone: str,
    advisory: Union[EarlyWarningAdvisory, Dict[str, Any]],
) -> bool:
    """
    Saves the early warning advisory to Firestore for the frontend UI.
    Accepts either an EarlyWarningAdvisory Pydantic model or a dumped dict.
    """
    db = get_firestore_db()
    if not db:
        return False

    # Handle both Pydantic models and pre-dumped dictionaries seamlessly
    advisory_dict = (
        advisory.model_dump()
        if isinstance(advisory, EarlyWarningAdvisory)
        else advisory
    )

    document_data = {
        "warning_id": warning_id,
        "farmer_id": farmer_id,
        "latitude": latitude,
        "longitude": longitude,
        "zone": zone,
        "analysis": advisory_dict,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        db.collection("early_warnings").document(warning_id).set(document_data)
        return True
    except Exception as e:
        logger.error(f"Firestore save error: {e}")
        return False