"""SQLModel mirrors of the tables/views in db/supabase/migrations. The DB enforces the rules
(checks, ownership FKs, RLS); validation here only gives nicer 422s."""

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import ARRAY, String
from sqlmodel import Field, SQLModel


def _now() -> datetime:
    return datetime.now(UTC)


class AccountType(StrEnum):
    debit = "debit"
    credit = "credit"
    cash = "cash"
    savings = "savings"
    investment = "investment"


class AccountCreate(SQLModel):
    name: str = Field(min_length=1, max_length=100)
    type: AccountType
    institution: str | None = Field(default=None, max_length=100)
    currency: str = Field(default="MXN", min_length=3, max_length=3)
    opening_balance: Decimal = Field(default=Decimal(0), max_digits=14, decimal_places=2)
    # Credit cards added mid-period: what's left to pay of the last corte; the rest of the opening
    # debt counts as charges of the current period.
    last_statement_pending: Decimal | None = Field(
        default=None, ge=0, max_digits=14, decimal_places=2
    )
    credit_limit: Decimal | None = Field(default=None, gt=0, max_digits=14, decimal_places=2)
    statement_day: int | None = Field(default=None, ge=1, le=31)
    payment_due_day: int | None = Field(default=None, ge=1, le=31)
    archived_at: datetime | None = None


class Account(AccountCreate, table=True):
    __tablename__ = "accounts"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID
    created_at: datetime = Field(default_factory=_now)


class CategoryKind(StrEnum):
    expense = "expense"
    income = "income"


class CategoryCreate(SQLModel):
    name: str = Field(min_length=1, max_length=100)
    icon: str | None = Field(default=None, max_length=16)  # an emoji
    kind: CategoryKind
    parent_id: uuid.UUID | None = None


class Category(CategoryCreate, table=True):
    __tablename__ = "categories"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID
    created_at: datetime = Field(default_factory=_now)


class TransactionKind(StrEnum):
    expense = "expense"
    income = "income"
    transfer = "transfer"


class TransactionCreate(SQLModel):
    kind: TransactionKind
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    occurred_on: date
    account_id: uuid.UUID
    to_account_id: uuid.UUID | None = None
    category_id: uuid.UUID | None = None
    description: str | None = Field(default=None, max_length=200)
    notes: str | None = None
    tags: list[str] = Field(default_factory=list, sa_type=ARRAY(String))
    location_name: str | None = Field(default=None, max_length=200)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class Transaction(TransactionCreate, table=True):
    __tablename__ = "transactions"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID
    created_at: datetime = Field(default_factory=_now)


# Read-only views


class AccountBalance(SQLModel, table=True):
    __tablename__ = "account_balances"
    account_id: uuid.UUID = Field(primary_key=True)
    balance: Decimal
    available_credit: Decimal | None


class CreditCardStatement(SQLModel, table=True):
    __tablename__ = "credit_card_statements"
    account_id: uuid.UUID = Field(primary_key=True)
    statement_date: date = Field(primary_key=True)
    period_start: date
    due_date: date
    is_closed: bool
    charges: Decimal
    statement_balance: Decimal
    payments: Decimal
    pending: Decimal
