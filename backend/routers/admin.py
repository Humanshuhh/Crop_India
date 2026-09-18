from fastapi import APIRouter, status
from backend.database.firestore_crud import get_admin_dashboard_stats

router = APIRouter(prefix="/api/v1/admin", tags=["Admin Dashboard"])

@router.get("/metrics", status_code=status.HTTP_200_OK)
def get_dashboard_metrics():
    """
    Fetches system-wide counts for the agronomist dashboard.
    Returns total farmers, active early warnings, soil records, and diagnostics.
    """
    stats = get_admin_dashboard_stats()
    return {
        "status": "success",
        "message": "Metrics retrieved successfully.",
        "data": stats
    }