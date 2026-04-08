from pathlib import Path
from app.schemas.review import AnalysisResult, PullRequestItem, GraphPayload
from app.services.code_parser import analyze_file
from app.services.graph_builder import build_graph_from_analysis


def _all_prs() -> list[PullRequestItem]:
    return [
        PullRequestItem(
            id="pr-184",
            number=184,
            title="Refactor auth middleware and token guards",
            author="manu",
            status="review",
            changedFiles=9,
        ),
        PullRequestItem(
            id="pr-185",
            number=185,
            title="Add repository dependency graph endpoint",
            author="alex",
            status="open",
            changedFiles=6,
        ),
        PullRequestItem(
            id="pr-186",
            number=186,
            title="Optimize Neo4j traversal with depth cap",
            author="sam",
            status="open",
            changedFiles=4,
        ),
    ]


async def list_pull_requests(org_id: str) -> list[PullRequestItem]:
    _ = org_id
    return _all_prs()


async def get_analysis(org_id: str, pr_id: str) -> AnalysisResult:
    _ = org_id
    prs = {item.id: item for item in _all_prs()}
    selected = prs.get(pr_id, prs["pr-184"])
    risk_map = {"pr-184": 71, "pr-185": 38, "pr-186": 24}
    issue_map = {
        "pr-184": [
            {
                "id": "i-1",
                "type": "security",
                "severity": "high",
                "message": "Missing org_id enforcement in one protected route",
                "file": "backend/routers/reviews.py",
                "line": 47,
                "recommendation": "Inject org_id from JWT dependency in all entry routes.",
            }
        ],
        "pr-185": [
            {
                "id": "i-4",
                "type": "quality",
                "severity": "low",
                "message": "Graph endpoint does not paginate node list",
                "file": "backend/routers/graph.py",
                "line": 29,
                "recommendation": "Add cursor-based pagination for nodes and edges.",
            }
        ],
        "pr-186": [],
    }
    
    # Build real graph from backend/app directory
    base_path = Path(__file__).parent.parent  # backend/app
    
    analysis_data = {}
    if base_path.exists():
        for py_file in base_path.rglob("*.py"):
            if ".venv" not in str(py_file) and "venv" not in str(py_file):
                try:
                    data = analyze_file(str(py_file))
                    analysis_data[str(py_file.relative_to(base_path))] = data
                except Exception:
                    pass
    
    graph = build_graph_from_analysis(analysis_data)
    
    return AnalysisResult(
        pr=selected,
        riskScore=risk_map.get(selected.id, 50),
        summary="Phase 2 analysis result from real code parsing.",
        issues=issue_map.get(selected.id, []),
        graph=graph,
    )
