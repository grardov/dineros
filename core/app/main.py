from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.api.main import api_router
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.exception_handler(IntegrityError)
def integrity_error(_request: Request, exc: IntegrityError) -> JSONResponse:
    # The DB is the source of truth for business rules (checks, ownership FKs, uniqueness).
    diag = getattr(exc.orig, "diag", None)
    detail = getattr(diag, "message_primary", None) or "Integrity error"
    return JSONResponse({"detail": detail}, status_code=status.HTTP_409_CONFLICT)
