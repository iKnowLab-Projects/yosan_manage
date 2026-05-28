from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = Field(
        default="postgresql+psycopg2://yosan:yosan@localhost:5432/yosan",
        alias="DATABASE_URL",
    )
    secret_key: str = Field(default="dev-secret-change-me", alias="SECRET_KEY")
    algorithm: str = Field(default="HS256", alias="ALGORITHM")
    access_token_expire_minutes: int = Field(default=1440, alias="ACCESS_TOKEN_EXPIRE_MINUTES")

    cors_origins: str = Field(
        default="http://localhost:3000,http://localhost:19006",
        alias="CORS_ORIGINS",
    )

    firebase_credentials_path: str | None = Field(default=None, alias="FIREBASE_CREDENTIALS_PATH")

    seed_admin_email: str = Field(default="admin@yosan.local", alias="SEED_ADMIN_EMAIL")
    seed_admin_password: str = Field(default="admin1234", alias="SEED_ADMIN_PASSWORD")

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
