from fastapi import APIRouter, Depends

from app.core.auth import get_org_id
from app.schemas.environment import HealthReport
from app.services.environment_scanner import scan_environment

router = APIRouter(prefix="/api/v1/environment", tags=["environment"])


@router.get("/scan", response_model=HealthReport)
async def scan_env(org_id: str = Depends(get_org_id)) -> HealthReport:
    """Scan the environment and return health report."""
    _ = org_id
    return scan_environment()
