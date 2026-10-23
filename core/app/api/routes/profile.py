from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, status
from sqlmodel import col, delete, text

from app.api.deps import CurrentUserId, SessionDep, get_or_404
from app.models import Account, Category, Onboarding, Profile, ProfileUpdate, Recurring

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("/")
def get_profile(session: SessionDep, user_id: CurrentUserId) -> Profile:
    return get_or_404(session, Profile, user_id)


@router.put("/")
def update_profile(session: SessionDep, user_id: CurrentUserId, body: ProfileUpdate) -> Profile:
    profile = get_or_404(session, Profile, user_id)
    profile.sqlmodel_update(body.model_dump())
    session.commit()
    session.refresh(profile)
    return profile


@router.post("/onboarding")
def onboard(session: SessionDep, user_id: CurrentUserId, body: Onboarding) -> Profile:
    """Saves the whole onboarding at once, so a failure never leaves half of it behind."""
    profile = get_or_404(session, Profile, user_id)
    if profile.onboarded_at:
        raise HTTPException(status.HTTP_409_CONFLICT, "Already onboarded")
    account = Account.model_validate(body.account, update={"user_id": user_id})
    session.add(account)
    session.flush()
    for fijo in body.recurring:
        session.add(
            Recurring.model_validate(fijo, update={"user_id": user_id, "account_id": account.id})
        )
    session.flush()  # before the categories go, so a removed one just unlinks its fijo
    ids = body.remove_category_ids
    session.exec(delete(Category).where(col(Category.parent_id).in_(ids)))
    session.exec(delete(Category).where(col(Category.id).in_(ids)))
    profile.sqlmodel_update(
        {
            "display_name": body.display_name,
            "currency": body.currency,
            "onboarded_at": datetime.now(UTC),
        }
    )
    session.commit()
    session.refresh(profile)
    return profile


@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(session: SessionDep) -> None:
    """Deletes the signed-in user and everything they own. No undo."""
    session.exec(text("select public.delete_current_user()"))
    session.commit()
