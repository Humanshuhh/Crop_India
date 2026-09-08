from fastapi import APIRouter, HTTPException
from backend.database.schemas import FarmerSchema
from backend.database.firebase import get_firestore_db

router = APIRouter(prefix="/db", tags=["Database Operations"])

@router.post("/farmer")
def create_farmer(farmer: FarmerSchema):
    """Save farmer profile to Firestore."""
    db = get_firestore_db()
    if not db:
        raise HTTPException(status_code=500, detail="Database connection uninitialized. Missing credentials.")
    
    # Save to Firestore collection 'farmers'
    db.collection("farmers").document(farmer.farmer_id).set(farmer.model_dump())
    return {"status": "success", "message": "Farmer saved successfully", "data": farmer}

@router.get("/farmer/{farmer_id}")
def get_farmer(farmer_id: str):
    """Retrieve farmer profile from Firestore."""
    db = get_firestore_db()
    if not db:
        raise HTTPException(status_code=500, detail="Database connection uninitialized. Missing credentials.")
    
    doc = db.collection("farmers").document(farmer_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    return doc.to_dict()