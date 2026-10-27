import logging
from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException, Query
from google.cloud import firestore

from backend.database.firebase import get_firestore_db

logger = logging.getLogger("kisan_sahayak.history")

router = APIRouter(prefix="/api/v1/history", tags=["History"])


@router.get("/{farmer_id}", response_model=List[Dict[str, Any]])
async def get_history(
    farmer_id: str,
    limit_count: int = Query(25, ge=1, le=100, description="Max history entries to return"),
):
    """
    Get combined diagnostic (leaf scans) and soil advisory history for an authenticated farmer,
    ordered from newest to oldest.
    """
    db = get_firestore_db()
    if db is None:
        logger.warning("Firestore database client is unavailable; returning empty history list.")
        return []

    # Enforce strict user-specific isolation: never return history for demo, guest, or unauthenticated fallbacks
    clean_farmer_id = (farmer_id or "").strip()
    if not clean_farmer_id or clean_farmer_id.lower() in ("default_farmer", "guest", "all", "none", "null"):
        return []

    combined_history: List[Dict[str, Any]] = []

    try:
        # 1. Fetch Leaf Diagnostics for this authenticated farmer
        leaf_ref = db.collection("leaf_diagnostics")
        leaf_query = leaf_ref.where("farmer_id", "==", clean_farmer_id)

        leaf_docs = (
            leaf_query.order_by("created_at", direction=firestore.Query.DESCENDING)
            .limit(limit_count)
            .stream()
        )

        for doc in leaf_docs:
            item = doc.to_dict()
            item["id"] = doc.id
            item["category"] = "LEAF_DISEASE"
            combined_history.append(item)

        # 2. Fetch Soil Health Records for this authenticated farmer
        soil_ref = db.collection("soil_health_records")
        soil_query = soil_ref.where("farmer_id", "==", clean_farmer_id)

        soil_docs = (
            soil_query.order_by("created_at", direction=firestore.Query.DESCENDING)
            .limit(limit_count)
            .stream()
        )

        for doc in soil_docs:
            item = doc.to_dict()
            item["id"] = doc.id
            item["category"] = "SOIL_HEALTH"
            combined_history.append(item)

        # 3. Sort all records by timestamp (newest first)
        combined_history.sort(
            key=lambda x: x.get("created_at") or x.get("timestamp", ""),
            reverse=True,
        )

        return combined_history[:limit_count]

    except Exception as exc:
        logger.error(f"Error fetching history for farmer '{farmer_id}': {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve farmer history: {str(exc)}",
        )
