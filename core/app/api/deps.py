import json
import uuid
from collections.abc import Generator
from typing import Annotated, Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import event
from sqlmodel import Session, SQLModel, text

from app.core.config import settings
from app.core.db import engine

_issuer = f"{settings.SUPABASE_URL}/auth/v1"
# Supabase signs user JWTs with an asymmetric key; the public keys are cached after first fetch.
_jwks = jwt.PyJWKClient(f"{_issuer}/.well-known/jwks.json")
_bearer = HTTPBearer(auto_error=False)


def get_claims(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> dict[str, Any]:
    unauthorized = HTTPException(
        status.HTTP_401_UNAUTHORIZED, "Not authenticated", {"WWW-Authenticate": "Bearer"}
    )
    if creds is None:
        raise unauthorized
    try:
        key = _jwks.get_signing_key_from_jwt(creds.credentials)
        return jwt.decode(
            creds.credentials,
            key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
            issuer=_issuer,
        )
    except jwt.PyJWTError:
        raise unauthorized


ClaimsDep = Annotated[dict[str, Any], Depends(get_claims)]


def get_user_id(claims: ClaimsDep) -> uuid.UUID:
    return uuid.UUID(claims["sub"])


CurrentUserId = Annotated[uuid.UUID, Depends(get_user_id)]


def get_db(claims: ClaimsDep) -> Generator[Session]:
    with Session(engine) as session:
        # Every transaction in this session runs as `core` with the caller's claims, so Postgres
        # RLS (auth.uid()) scopes all reads and writes to the user. `set_config(..., true)` is
        # transaction-local, so nothing leaks to the next request using the pooled connection.
        @event.listens_for(session, "after_begin")
        def _run_as_user(_session, _transaction, connection) -> None:
            connection.execute(
                text(
                    "select set_config('role', 'core', true),"
                    " set_config('request.jwt.claims', :claims, true)"
                ),
                {"claims": json.dumps(claims)},
            )

        yield session


SessionDep = Annotated[Session, Depends(get_db)]


def get_or_404[T: SQLModel](session: Session, model: type[T], id: uuid.UUID) -> T:
    # RLS hides other users' rows, so "not yours" and "doesn't exist" are the same 404.
    obj = session.get(model, id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"{model.__name__} not found")
    return obj
