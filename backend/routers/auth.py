import uuid
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
    
    # --- NEW: Auto-generate unique ID if frontend does not provide one ---
    if not farmer_data.farmer_id:
        farmer_data.farmer_id = f"FARM_{uuid.uuid4().hex[:8].upper()}"

    db = get_firestore_db()
    if not db:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Database connection failed"
        )
        
    # 1. DUPLICATE CHECK: Does this phone number already exist?
    existing_farmers = db.collection("farmers").where("phone", "==", farmer_data.phone).limit(1).get()
    if len(existing_farmers) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A farmer with this phone number is already registered."
        )

    # 2. Save to database if it is a new user
    success = save_farmer_profile(farmer_data)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save farmer profile to database.",
        )
    
    return LoginResponse(
        status="success",
        message="Farmer registered successfully",
        role="farmer",
        user_id=farmer_data.farmer_id,
        token="dummy_farmer_jwt_token_for_hackathon"
    )

@router.post("/login", response_model=LoginResponse, status_code=status.HTTP_200_OK)
def unified_login(credentials: LoginRequest):
    """
    Unified login handler supporting Role-Based Access Control (RBAC).
    Routes Admins and Farmers based on credentials.
    """
    db = get_firestore_db()
    if not db:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Database connection failed"
        )

    # 1. Check if the user is an Admin (Agronomist/Official)
    admin_user = get_admin_profile(credentials.username_or_phone)
    if admin_user and admin_user.get("password") == credentials.password:
        return LoginResponse(
            status="success",
            message="Admin login successful",
            role="admin",
            user_id=admin_user["admin_id"],
            token="dummy_admin_jwt_token_for_hackathon"
        )

    # 2. If not admin, check if the user is a Farmer
    # Assumes farmers log in with their phone number/ID as the document ID
    farmer_ref = db.collection("farmers").document(credentials.username_or_phone).get()
    if farmer_ref.exists:
        # In a production app, you would verify a password or OTP here.
        # For the hackathon demo, verifying their phone number exists is sufficient.
        return LoginResponse(
            status="success",
            message="Farmer login successful",
            role="farmer",
            user_id=farmer_ref.id,
            token="dummy_farmer_jwt_token_for_hackathon"
        )

    # 3. User not found
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, 
        detail="Invalid credentials or unregistered user"
    )