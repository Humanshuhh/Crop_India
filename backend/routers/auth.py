import uuid
import secrets  
import hashlib  
from fastapi import APIRouter, HTTPException, status
from backend.schemas.auth_schemas import LoginRequest, LoginResponse
from backend.schemas.Farmer_schemas import FarmerSchema
from backend.database.firestore_crud import (
    get_admin_profile,
    save_farmer_profile,
)
from backend.database.firebase import get_firestore_db

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

@router.post("/signup", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def farmer_signup(farmer_data: FarmerSchema):
    """Registers a new farmer into the system."""
    
    if not farmer_data.farmer_id:
        farmer_data.farmer_id = f"FARM_{uuid.uuid4().hex[:8].upper()}"

    db = get_firestore_db()
    if not db:
        raise HTTPException(status_code=500, detail="Database connection failed")
        
    existing_farmers = db.collection("farmers").where("phone", "==", farmer_data.phone).limit(1).get()
    if len(existing_farmers) > 0:
        raise HTTPException(status_code=400, detail="A farmer with this phone number is already registered.")

    # --- BULLETPROOF HASHING: Grab from either mpin or pin, and save BOTH ---
    raw_pin = farmer_data.mpin or farmer_data.pin
    if not raw_pin:
        raise HTTPException(status_code=400, detail="MPIN is required for signup.")

    hashed_pin = hashlib.sha256(raw_pin.encode()).hexdigest()
    farmer_data.pin = hashed_pin
    farmer_data.mpin = hashed_pin

    success = save_farmer_profile(farmer_data)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save farmer profile to database.")
    
    secure_token = secrets.token_hex(32)
    
    return LoginResponse(
        status="success",
        message="Farmer registered successfully",
        role="farmer",
        user_id=farmer_data.farmer_id,
        token=secure_token,
        name=farmer_data.name
    )

@router.post("/login", response_model=LoginResponse, status_code=status.HTTP_200_OK)
def unified_login(credentials: LoginRequest):
    """Unified login handler supporting hashed & fallback MPIN match."""
    db = get_firestore_db()
    if not db:
        raise HTTPException(status_code=500, detail="Database connection failed")

    # 1. Check if Admin
    admin_user = get_admin_profile(credentials.username_or_phone)
    if admin_user and admin_user.get("password") == credentials.password:
        return LoginResponse(
            status="success",
            message="Admin login successful",
            role="admin",
            user_id=admin_user["admin_id"],
            token=secrets.token_hex(32),
            name=admin_user.get("name")
        )

    # 2. Check if Farmer
    if not re.fullmatch(r"\d{10}", credentials.username_or_phone):
        raise HTTPException(
            status_code=400,
            detail="Phone number must be exactly 10 digits."
        )
    
    # --- MISSING QUERY ADDED HERE ---
    farmer_query = db.collection("farmers").where("phone", "==", credentials.username_or_phone).limit(1).get()
    
    if len(farmer_query) > 0:
        farmer_doc = farmer_query[0].to_dict()
        
        # Hash incoming password/MPIN
        incoming_hash = hashlib.sha256(credentials.password.encode()).hexdigest()
        
        # Check both 'pin' and 'mpin' keys from Firestore document
        stored_pin = farmer_doc.get("pin") or farmer_doc.get("mpin")
        
        # Verify against Hashed Hash or Plain-Text fallback (for older records)
        if stored_pin and (stored_pin == incoming_hash or stored_pin == credentials.password):
            return LoginResponse(
                status="success",
                message="Farmer login successful",
                role="farmer",
                user_id=farmer_query[0].id,
                token=secrets.token_hex(32),
                name=farmer_doc.get("name")
            )
        else:
            raise HTTPException(status_code=401, detail="Invalid MPIN. Please try again.")

    raise HTTPException(status_code=401, detail="Invalid credentials or unregistered user.")