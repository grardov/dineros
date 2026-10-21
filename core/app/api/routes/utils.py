from fastapi import APIRouter
from sqlmodel import text

from app.api.deps import SessionDep

router = APIRouter(prefix="/utils", tags=["utils"])


@router.get("/health-check/")
def health_check(session: SessionDep) -> bool:
    return session.exec(text("select true")).one()[0]
