import uuid
from collections.abc import Callable

import httpx
import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app

# Default publishable key of the local Supabase stack (`pnpm --filter db status`).
LOCAL_PUBLISHABLE_KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"


@pytest.fixture
def client() -> TestClient:
    return TestClient(app, base_url="http://test/api/v1")


@pytest.fixture
def new_user() -> Callable[[], dict[str, str]]:
    """Signs up a fresh user in local Supabase Auth and returns its Authorization header."""

    def signup() -> dict[str, str]:
        r = httpx.post(
            f"{settings.SUPABASE_URL}/auth/v1/signup",
            headers={"apikey": LOCAL_PUBLISHABLE_KEY},
            json={
                "email": f"test-{uuid.uuid4().hex[:12]}@example.test",
                "password": "test-pass-123",
            },
        )
        r.raise_for_status()
        return {"Authorization": f"Bearer {r.json()['access_token']}"}

    return signup
