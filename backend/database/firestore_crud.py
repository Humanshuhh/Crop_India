from backend.database.firebase import get_firestore_db
from backend.schemas.Farmer_schemas import FarmerSchema
from backend.schemas.soil_schemas import SoilHealthCardInput, RegenerativeActionPlan
from backend.schemas.diagnosis_schemas import CropDiagnosisResponse
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
    
    # Merging the input metrics and the output plan into a single record
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