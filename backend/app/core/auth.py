import os
from typing import Any

import jwt
from fastapi import Header, HTTPException

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


async def get_org_id(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail={"error": "unauthorized", "code": 401, "detail": "Missing Bearer token"},
        )
    token = authorization.replace("Bearer ", "", 1)
    claims: dict[str, Any]
    try:
        claims = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=401,
            detail={"error": "unauthorized", "code": 401, "detail": "Invalid token"},
        ) from exc
    org_id = claims.get("org_id")
    if not org_id:
        raise HTTPException(
            status_code=401,
            detail={"error": "unauthorized", "code": 401, "detail": "Missing org_id claim"},
        )
    return str(org_id)
