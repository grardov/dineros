import uuid

from fastapi import APIRouter, Query, status
from sqlmodel import or_, select

from app.api.deps import CurrentUserId, SessionDep, get_or_404
from app.models import Transaction, TransactionCreate

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("/")
def list_transactions(
    session: SessionDep,
    account_id: uuid.UUID | None = None,
    limit: int = Query(default=100, ge=1, le=500),
) -> list[Transaction]:
    query = select(Transaction)
    if account_id:
        # A transfer shows up in both accounts.
        query = query.where(
            or_(Transaction.account_id == account_id, Transaction.to_account_id == account_id)
        )
    query = query.order_by(Transaction.occurred_on.desc(), Transaction.created_at.desc())
    return session.exec(query.limit(limit)).all()


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
