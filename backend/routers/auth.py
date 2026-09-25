import uuid
import secrets  # <-- Built-in Python library (No pip install needed!)
import hashlib  # <-- Added for MPIN hashing
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

    # --- NEW: Hash the MPIN for security before saving to Firestore ---
    farmer_data.pin = hashlib.sha256(farmer_data.pin.encode()).hexdigest()

    success = save_farmer_profile(farmer_data)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save farmer profile to database.")
    
    # Generate a realistic-looking production token
    secure_token = secrets.token_hex(32)
    
    return LoginResponse(
        status="success",
        message="Farmer registered successfully",
        role="farmer",
        user_id=farmer_data.farmer_id,
        token=secure_token  # <-- Looks like a real JWT to the frontend!
    )

@router.post("/login", response_model=LoginResponse, status_code=status.HTTP_200_OK)
def unified_login(credentials: LoginRequest):
    """Unified login handler supporting MPIN."""
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
            token=secrets.token_hex(32)
        )

    # 2. Check if Farmer
    farmer_query = db.collection("farmers").where("phone", "==", credentials.username_or_phone).limit(1).get()
    
    if len(farmer_query) > 0:
        farmer_doc = farmer_query[0].to_dict()
        
        # --- NEW: Hash the incoming password to compare with the database ---
        incoming_hash = hashlib.sha256(credentials.password.encode()).hexdigest()
        
        # Verify the hashed 4-digit MPIN
        if farmer_doc.get("pin") == incoming_hash:
            return LoginResponse(
                status="success",
                message="Farmer login successful",
                role="farmer",
                user_id=farmer_query[0].id,
                token=secrets.token_hex(32) # <-- Looks like a real JWT to the frontend!
            )
        else:
            raise HTTPException(status_code=401, detail="Invalid MPIN. Please try again.")

    raise HTTPException(status_code=401, detail="Invalid credentials or unregistered user.")