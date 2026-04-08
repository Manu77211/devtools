from fastapi import FastAPI

from app.core.errors import register_error_handlers
from app.routers.review import router as review_router
from app.routers.graph import router as graph_router
from app.routers.environment import router as environment_router

app = FastAPI(title="DevGraph API", version="0.1.0")
app.include_router(review_router)
app.include_router(graph_router)
app.include_router(environment_router)
register_error_handlers(app)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
