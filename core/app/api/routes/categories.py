import uuid

from fastapi import APIRouter, status
from sqlmodel import select

from app.api.deps import CurrentUserId, SessionDep, get_or_404
from app.models import Category, CategoryCreate

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("/")
def list_categories(session: SessionDep) -> list[Category]:
    return session.exec(select(Category).order_by(Category.kind, Category.name)).all()


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_category(session: SessionDep, user_id: CurrentUserId, body: CategoryCreate) -> Category:
    category = Category.model_validate(body, update={"user_id": user_id})
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


@router.put("/{category_id}")
def update_category(session: SessionDep, category_id: uuid.UUID, body: CategoryCreate) -> Category:
    category = get_or_404(session, Category, category_id)
    category.sqlmodel_update(body.model_dump())
    session.commit()
    session.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(session: SessionDep, category_id: uuid.UUID) -> None:
    # Its transactions and subcategories keep existing, uncategorized / top-level.
    session.delete(get_or_404(session, Category, category_id))
    session.commit()
