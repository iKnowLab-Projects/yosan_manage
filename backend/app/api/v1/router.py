from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    mileage,
    notifications,
    patients,
    reports,
    surveys,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(patients.router)
api_router.include_router(reports.router)
api_router.include_router(notifications.router)
api_router.include_router(surveys.router)
api_router.include_router(mileage.router)
