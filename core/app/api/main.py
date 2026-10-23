from fastapi import APIRouter, Depends

from app.api.deps import get_claims
from app.api.routes import accounts, categories, profile, recurring, transactions, utils

# Every endpoint requires a valid Supabase user JWT, even ones that don't touch the DB.
api_router = APIRouter(dependencies=[Depends(get_claims)])
api_router.include_router(utils.router)
api_router.include_router(accounts.router)
api_router.include_router(categories.router)
api_router.include_router(transactions.router)
api_router.include_router(recurring.router)
api_router.include_router(profile.router)
