from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    board,
    cardnews,
    inbody,
    meal_scores,
    mileage,
    notifications,
    patients,
    reports,
    surveys,
    uploads,
    views,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(patients.router)
api_router.include_router(reports.router)
api_router.include_router(notifications.router)
api_router.include_router(surveys.router)
api_router.include_router(mileage.router)
api_router.include_router(board.router)
api_router.include_router(cardnews.router)
api_router.include_router(inbody.router)
api_router.include_router(meal_scores.router)
api_router.include_router(uploads.router)
api_router.include_router(views.router)
