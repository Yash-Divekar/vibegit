from fastapi import APIRouter
from services.stats import calculate_project_stats

router = APIRouter(prefix="/api/stats", tags=["stats"])

@router.get("")
async def get_statistics(project: str = "default"):
    return await calculate_project_stats(project)
