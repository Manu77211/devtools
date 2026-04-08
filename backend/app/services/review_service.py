from app.schemas.review import AnalysisResult, PullRequestItem


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
    graph = {
        "nodes": [
            {"id": "pr", "label": f"PR #{selected.number}", "type": "pr", "x": 340, "y": 120},
            {"id": "file1", "label": "module.py", "type": "file", "x": 340, "y": 280},
        ],
        "edges": [{"id": "e1", "source": "pr", "target": "file1", "relation": "modifies"}],
    }
    return AnalysisResult(
        pr=selected,
        riskScore=risk_map.get(selected.id, 50),
        summary="Phase 1 analysis result from backend service.",
        issues=issue_map.get(selected.id, []),
        graph=graph,
    )
