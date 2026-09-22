from pydantic import BaseModel, Field
from typing import Optional, List

# Schema for Farmer Profile
class FarmerSchema(BaseModel):
    farmer_id: Optional[str] = Field(default=None, description="Unique ID for the farmer")
    name: str
    phone: str
    state: str
    district: str
    language: str = "en"

# Schema for Field / Land Details
class FieldSchema(BaseModel):
    field_id: Optional[str] = Field(default=None, description="Unique ID for the field")
    farmer_id: str
    area_acres: float
    soil_type: Optional[str] = None
    crops_grown: List[str] = []

# Schema for Crop Diagnosis Entry
class DiagnosisRecordSchema(BaseModel):
    diagnosis_id: Optional[str] = Field(default=None, description="Unique ID for the diagnosis record")
    farmer_id: str
    image_url: str
    disease_detected: str
    confidence_score: float
    recommended_action: str