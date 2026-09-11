from typing import List, Optional
from pydantic import BaseModel, Field
from backend.schemas.common import Coordinates

class FarmerLocation(Coordinates):
    village: str = Field(..., description="Village name")
    district: str = Field(..., description="District name")
    state: str = Field(..., description="State name")

class FarmerCreateSchema(BaseModel):
    farmer_id: str = Field(..., description="Unique document ID (e.g., farmer_101)")
    name: str = Field(..., description="Farmer full name")
    phone: str = Field(..., description="Phone number")
    location: FarmerLocation = Field(..., description="Geographic and administrative location")
    land_area_acres: float = Field(..., gt=0, description="Operational plot size in acres")
    primary_crops: List[str] = Field(default_factory=list, description="Active or historical standing crops")
    api_key: Optional[str] = Field(None, description="Farm-level authentication token")