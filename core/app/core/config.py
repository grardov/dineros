from pydantic import PostgresDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True, extra="ignore")

    # Supabase local (`pnpm db:start`). In the cloud use the "Session pooler" connection string.
    DATABASE_URL: PostgresDsn = "postgresql+psycopg://postgres:postgres@127.0.0.1:55322/postgres"
    # Supabase Auth issues the JWTs; core verifies them against this project's public keys (JWKS).
    SUPABASE_URL: str = "http://127.0.0.1:55321"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def use_psycopg_driver(cls, v: str) -> str:
        # Supabase hands out `postgresql://...`; SQLAlchemy needs the driver explicit.
        return v.replace("postgresql://", "postgresql+psycopg://", 1)


settings = Settings()
