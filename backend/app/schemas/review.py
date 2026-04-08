from pydantic import BaseModel, Field


class PullRequestItem(BaseModel):
    id: str
    number: int
    title: str
    author: str
    status: str
    changed_files: int = Field(alias="changedFiles")

    model_config = {"populate_by_name": True}


class GraphNode(BaseModel):
    id: str
    label: str
    type: str
    severity: str | None = None
    x: int
    y: int


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    relation: str


class ReviewIssue(BaseModel):
    id: str
    type: str
    severity: str
    message: str
    file: str
    line: int
    recommendation: str


class GraphPayload(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


class AnalysisResult(BaseModel):
    pr: PullRequestItem
    risk_score: int = Field(alias="riskScore")
    summary: str
    issues: list[ReviewIssue]
    graph: GraphPayload

    model_config = {"populate_by_name": True}
