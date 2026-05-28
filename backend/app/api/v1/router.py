from fastapi import APIRouter

from app.api.v1.endpoints import auth, notifications, patients, reports

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(patients.router)
api_router.include_router(reports.router)
api_router.include_router(notifications.router)
