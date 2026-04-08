from fastapi import APIRouter, Depends

from app.core.auth import get_org_id
from app.schemas.review import AnalysisResult, PullRequestItem
from app.services.review_service import get_analysis, list_pull_requests

router = APIRouter(prefix="/api/v1/review", tags=["review"])


@router.get("/pull-requests", response_model=list[PullRequestItem])
async def pull_requests(org_id: str = Depends(get_org_id)) -> list[PullRequestItem]:
    return await list_pull_requests(org_id=org_id)


@router.get("/analyze/{pr_id}", response_model=AnalysisResult)
async def analyze_pr(pr_id: str, org_id: str = Depends(get_org_id)) -> AnalysisResult:
    return await get_analysis(org_id=org_id, pr_id=pr_id)
