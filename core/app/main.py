from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.api.main import api_router

app = FastAPI(title="Dineros", openapi_url="/api/v1/openapi.json")

app.include_router(api_router, prefix="/api/v1")


@app.exception_handler(IntegrityError)
def integrity_error(_request: Request, exc: IntegrityError) -> JSONResponse:
    # The DB is the source of truth for business rules (checks, ownership FKs, uniqueness).
    diag = getattr(exc.orig, "diag", None)
    detail = getattr(diag, "message_primary", None) or "Integrity error"
    return JSONResponse({"detail": detail}, status_code=status.HTTP_409_CONFLICT)
