from backend.database.firebase import get_firestore_db
from backend.schemas.Farmer_schemas import FarmerSchema
from backend.schemas.soil_schemas import SoilHealthCardInput, RegenerativeActionPlan
from backend.schemas.diagnosis_schemas import CropDiagnosisResponse
# 1. ADDED YOUR NEW SCHEMA IMPORT HERE:
from backend.schemas.warning_schemas import EarlyWarningAdvisory 
from datetime import datetime

def save_farmer_profile(farmer_data: FarmerSchema) -> bool:
    """Saves the main farmer profile to Firestore."""
    db = get_firestore_db()
    if not db:
        return False
    
    db.collection("farmers").document(farmer_data.farmer_id).set(farmer_data.model_dump())
    return True

def save_soil_record(farmer_id: str, record_id: str, soil_input: SoilHealthCardInput, plan: RegenerativeActionPlan) -> bool:
    """Combines soil metrics and the AI action plan into one Firestore document."""
    db = get_firestore_db()
    if not db:
        return False
    
    document_data = {
        "farmer_id": farmer_id,
        "raw_metrics": soil_input.model_dump(),
        "regenerative_plan": plan.model_dump(),
        "created_at": datetime.utcnow().isoformat()
    }
    db.collection("soil_health_records").document(record_id).set(document_data)
    return True

def save_leaf_diagnostic(farmer_id: str, diagnostic_id: str, diagnosis: CropDiagnosisResponse) -> bool:
    """Saves the vision model's output and eco-friendly remedies."""
    db = get_firestore_db()
    if not db:
        return False
    
    document_data = {
        "farmer_id": farmer_id,
        "diagnosis_result": diagnosis.model_dump(),
        "timestamp": datetime.utcnow().isoformat()
    }
    db.collection("leaf_diagnostics").document(diagnostic_id).set(document_data)
    return True

# 2. UPDATED TO USE YOUR PYDANTIC SCHEMA
def save_early_warning_firestore(
    warning_id: str, 
    farmer_id: str, 
    latitude: float, 
    longitude: float, 
    zone: str, 
    advisory: EarlyWarningAdvisory  
) -> bool:
    """Saves the full early warning advisory to Firestore for the frontend UI."""
    db = get_firestore_db()
    if not db:
        return False
    
    document_data = {
        "warning_id": warning_id,
        "farmer_id": farmer_id,
        "latitude": latitude,
        "longitude": longitude,
        "zone": zone,
        "analysis": advisory.model_dump(), # We dump the schema directly into the DB here
        "created_at": datetime.utcnow().isoformat()
    }
    
    try:
        db.collection("early_warnings").document(warning_id).set(document_data)
        return True
    except Exception as e:
        print(f"Firestore save error: {e}")
        return False