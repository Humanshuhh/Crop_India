from typing import List
from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/history", tags=["History"])

@router.get("/{farmer_id}", response_model=List[dict])
async def get_history(farmer_id: str):
    """
    Get diagnostic and advisory history for a farmer.
    Returns an empty list as a stub.
    """
    return []
