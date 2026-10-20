from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True, extra="ignore")

    PROJECT_NAME: str = "Dineros"
    API_V1_STR: str = "/api/v1"
    FRONTEND_HOST: str = "http://localhost:3000"


settings = Settings()
