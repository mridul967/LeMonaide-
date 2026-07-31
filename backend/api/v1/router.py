"""
Master API v1 router consolidating endpoints.
"""

from fastapi import APIRouter

from api.v1.capabilities import router as capabilities_router
from api.v1.datasets import router as datasets_router
from api.v1.projects import router as projects_router
from api.v1.training import router as training_router

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(capabilities_router)
api_v1_router.include_router(projects_router)
api_v1_router.include_router(datasets_router)
api_v1_router.include_router(training_router)
