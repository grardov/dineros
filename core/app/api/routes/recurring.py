import uuid

from fastapi import APIRouter, status
from sqlmodel import select

from app.api.deps import CurrentUserId, SessionDep, get_or_404
from app.models import Recurring, RecurringCreate, RecurringOccurrence

router = APIRouter(prefix="/recurring", tags=["recurring"])


@router.get("/")
def list_recurring(session: SessionDep) -> list[Recurring]:
    return session.exec(select(Recurring).order_by(Recurring.day_of_month, Recurring.name)).all()


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_recurring(
    session: SessionDep, user_id: CurrentUserId, body: RecurringCreate
) -> Recurring:
    recurring = Recurring.model_validate(body, update={"user_id": user_id})
    session.add(recurring)
    session.commit()
    session.refresh(recurring)
    return recurring


@router.get("/occurrences/")
def list_occurrences(session: SessionDep) -> list[RecurringOccurrence]:
    """What each active fijo expects this month and next, by due date."""
    query = select(RecurringOccurrence).order_by(RecurringOccurrence.due_on)
    return session.exec(query).all()


@router.put("/{recurring_id}")
def update_recurring(
    session: SessionDep, recurring_id: uuid.UUID, body: RecurringCreate
) -> Recurring:
    recurring = get_or_404(session, Recurring, recurring_id)
    recurring.sqlmodel_update(body.model_dump())
    session.commit()
    session.refresh(recurring)
    return recurring


@router.delete("/{recurring_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recurring(session: SessionDep, recurring_id: uuid.UUID) -> None:
    # Its transactions stay, unlinked.
    session.delete(get_or_404(session, Recurring, recurring_id))
    session.commit()
