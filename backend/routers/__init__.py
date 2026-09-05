"""
NAARIN Routers Package
"""

from backend.routers.advisory_router import router as advisory_router
from backend.routers.diagnosis_router import router as diagnosis_router
from backend.routers.agristack_router import router as agristack_router
from backend.routers.federation_router import router as federation_router
from backend.routers.ml_router import router as ml_router

__all__ = [
    "advisory_router",
    "diagnosis_router",
    "agristack_router",
    "federation_router",
    "ml_router",
]
