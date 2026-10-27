import uuid
from datetime import date

from fastapi import APIRouter, Query, status
from sqlmodel import func, or_, select

from app.api.deps import CurrentUserId, SessionDep, get_or_404
from app.models import DailySpending, Transaction, TransactionCreate

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("/")
def list_transactions(
    session: SessionDep,
    account_id: uuid.UUID | None = None,
    limit: int = Query(default=100, ge=1, le=100_000),  # the high end is for the CSV export
) -> list[Transaction]:
    query = select(Transaction)
    if account_id:
        # A transfer shows up in both accounts.
        query = query.where(
            or_(Transaction.account_id == account_id, Transaction.to_account_id == account_id)
        )
    query = query.order_by(Transaction.occurred_on.desc(), Transaction.created_at.desc())
    return session.exec(query.limit(limit)).all()


@router.get("/daily/")
def daily_spending(session: SessionDep, since: date) -> list[DailySpending]:
    """Spending per day from `since` on, for the heatmaps. Fijos are left out: they're planned."""
    query = (
        select(Transaction.occurred_on, func.sum(Transaction.amount))
        .where(
            Transaction.kind == "expense",
            Transaction.recurring_id.is_(None),
            Transaction.occurred_on >= since,
        )
        .group_by(Transaction.occurred_on)
        .order_by(Transaction.occurred_on)
    )
    return [DailySpending(day=day, amount=amount) for day, amount in session.exec(query)]


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_transaction(
    session: SessionDep, user_id: CurrentUserId, body: TransactionCreate
) -> Transaction:
    transaction = Transaction.model_validate(body, update={"user_id": user_id})
    session.add(transaction)
    session.commit()
    session.refresh(transaction)
    return transaction


@router.put("/{transaction_id}")
def update_transaction(
    session: SessionDep, transaction_id: uuid.UUID, body: TransactionCreate
) -> Transaction:
    transaction = get_or_404(session, Transaction, transaction_id)
    transaction.sqlmodel_update(body.model_dump())
    session.commit()
    session.refresh(transaction)
    return transaction


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(session: SessionDep, transaction_id: uuid.UUID) -> None:
    session.delete(get_or_404(session, Transaction, transaction_id))
    session.commit()
