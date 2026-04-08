from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
        payload = exc.detail if isinstance(exc.detail, dict) else {
            "error": "http_error",
            "code": exc.status_code,
            "detail": str(exc.detail),
        }
        return JSONResponse(status_code=exc.status_code, content=payload)

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_: Request, __: Exception) -> JSONResponse:
        payload = {"error": "internal_error", "code": 500, "detail": "Internal server error"}
        return JSONResponse(status_code=500, content=payload)
