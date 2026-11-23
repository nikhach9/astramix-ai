"""
Application configuration.

Application-level debug, identity and CORS settings. Model selection lives
in the versioned active-model manifest; request schemas define search settings.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- General ---
    app_name: str = "AstraMix AI Backend"
    app_version: str = "1.0.0"
    debug: bool = False

    # --- CORS ---
    # Comma-separated list of allowed origins, e.g.
    #   ASTRAMIX_CORS_ORIGINS=http://localhost:3000,http://localhost:5173
    cors_origins: str = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="ASTRAMIX_",
        case_sensitive=False,
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance (loaded once per process)."""
    return Settings()
