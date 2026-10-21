import uuid
from datetime import date

from fastapi import APIRouter, Query, status
from sqlmodel import or_, select

from app.api.deps import CurrentUserId, SessionDep, get_or_404
from app.models import Transaction, TransactionCreate, TransactionKind

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("/")
def list_transactions(
    session: SessionDep,
    date_from: date | None = None,
    date_to: date | None = None,
    account_id: uuid.UUID | None = None,
    category_id: uuid.UUID | None = None,
    kind: TransactionKind | None = None,
    tag: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[Transaction]:
    query = select(Transaction)
    if date_from:
        query = query.where(Transaction.occurred_on >= date_from)
    if date_to:
        query = query.where(Transaction.occurred_on <= date_to)
    if account_id:
        # A transfer shows up in both accounts.
        query = query.where(
            or_(Transaction.account_id == account_id, Transaction.to_account_id == account_id)
        )
    if category_id:
        query = query.where(Transaction.category_id == category_id)
    if kind:
        query = query.where(Transaction.kind == kind)
    if tag:
        query = query.where(Transaction.tags.contains([tag]))
    query = query.order_by(Transaction.occurred_on.desc(), Transaction.created_at.desc())
    return session.exec(query.limit(limit).offset(offset)).all()


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_transaction(
    session: SessionDep, user_id: CurrentUserId, body: TransactionCreate
) -> Transaction:
    transaction = Transaction.model_validate(body, update={"user_id": user_id})
    session.add(transaction)
    session.commit()
    session.refresh(transaction)
    return transaction


@router.get("/{transaction_id}")
def get_transaction(session: SessionDep, transaction_id: uuid.UUID) -> Transaction:
    return get_or_404(session, Transaction, transaction_id)


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
