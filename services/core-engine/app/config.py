from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    db_host: str = "postgres"
    db_port: int = 5432
    db_name: str = "systemone"
    db_user: str = "postgres"
    db_password: str = ""

    redis_url: str = "redis://redis:6379/0"

    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24
    htpasswd_file: str = "/config/users.htpasswd"

    openclaw_enabled: bool = False
    openclaw_api_url: str = "http://openclaw:8080"
    openclaw_api_key: str = ""

    ntfy_enabled: bool = False
    ntfy_server_url: str = "https://ping.otchere.com"
    ntfy_topic: str = "portfolio"

    log_level: str = "INFO"

    @property
    def database_url(self) -> str:
        return f"postgresql+asyncpg://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

    @property
    def database_url_sync(self) -> str:
        return f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
