import uuid

from fastapi import APIRouter, status
from sqlmodel import select

from app.api.deps import CurrentUserId, SessionDep, get_or_404
from app.models import Account, AccountBalance, AccountCreate, CreditCardStatement

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("/")
def list_accounts(session: SessionDep, include_archived: bool = False) -> list[Account]:
    query = select(Account).order_by(Account.created_at)
    if not include_archived:
        query = query.where(Account.archived_at.is_(None))
    return session.exec(query).all()


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_account(session: SessionDep, user_id: CurrentUserId, body: AccountCreate) -> Account:
    account = Account.model_validate(body, update={"user_id": user_id})
    session.add(account)
    session.commit()
    session.refresh(account)
    return account


@router.get("/balances/")
def list_balances(session: SessionDep) -> list[AccountBalance]:
    return session.exec(select(AccountBalance)).all()


@router.get("/{account_id}")
def get_account(session: SessionDep, account_id: uuid.UUID) -> Account:
    return get_or_404(session, Account, account_id)


@router.put("/{account_id}")
def update_account(session: SessionDep, account_id: uuid.UUID, body: AccountCreate) -> Account:
    account = get_or_404(session, Account, account_id)
    account.sqlmodel_update(body.model_dump())
    session.commit()
    session.refresh(account)
    return account


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(session: SessionDep, account_id: uuid.UUID) -> None:
    # Fails with 409 while it has transactions; archive it instead (archived_at).
    session.delete(get_or_404(session, Account, account_id))
    session.commit()


@router.get("/{account_id}/statements/")
def list_statements(session: SessionDep, account_id: uuid.UUID) -> list[CreditCardStatement]:
    """Credit card cortes, newest first (the first one may still be open)."""
    get_or_404(session, Account, account_id)
    query = (
        select(CreditCardStatement)
        .where(CreditCardStatement.account_id == account_id)
        .order_by(CreditCardStatement.statement_date.desc())
    )
    return session.exec(query).all()
