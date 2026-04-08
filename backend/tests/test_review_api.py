import jwt
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _token(org_id: str = "org-demo") -> str:
    return jwt.encode({"org_id": org_id}, "dev-secret", algorithm="HS256")


def test_requires_auth_header() -> None:
    response = client.get("/api/v1/review/pull-requests")
    assert response.status_code == 401
    body = response.json()
    assert body["error"] == "unauthorized"


def test_pull_requests_success() -> None:
    headers = {"Authorization": f"Bearer {_token()}"}
    response = client.get("/api/v1/review/pull-requests", headers=headers)
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) >= 3
    assert "changedFiles" in payload[0]


def test_analysis_success() -> None:
    headers = {"Authorization": f"Bearer {_token()}"}
    response = client.get("/api/v1/review/analyze/pr-184", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["riskScore"] == 71
    assert body["pr"]["id"] == "pr-184"
