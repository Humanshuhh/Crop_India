from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class LoginRequest(BaseModel):
    """
    Unified login payload.
    - Agronomists log in via Email.
    - Farmers log in via Phone Number (or unique farmer_id).
    """
    username_or_phone: str = Field(..., description="Email for admin, Phone for farmer")
    password: str = Field(..., description="Password or OTP for authentication")

class LoginResponse(BaseModel):
    """
    Unified response payload handling both user types.
    The frontend uses the `role` field to route to the correct dashboard.
    """
    status: str = Field(..., description="Success or failure status")
    message: str = Field(..., description="Human-readable response message")
    role: str = Field(..., description="'admin' or 'farmer'")
    user_id: str = Field(..., description="The document ID for the authenticated user")
    token: Optional[str] = Field(None, description="JWT token for subsequent API calls")

class AdminProfileSchema(BaseModel):
    """
    Schema for Agricultural Officials / Agronomists.
    """
    name: str = Field(..., description="Full name of the official")
    email: EmailStr = Field(..., description="Official government/organizational email")
    password: str = Field(..., description="Secure password for admin login")
    role: str = Field(default="admin", description="Enforced RBAC role identifier")
    assigned_zone: str = Field(..., description="Agro-climatic zone they oversee")
    designation: str = Field(..., description="Job title or department role")