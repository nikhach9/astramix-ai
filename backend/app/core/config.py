"""
Application configuration.

Centralizes environment-driven settings so the rest of the codebase
never reads os.environ directly.
"""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- General ---
    app_name: str = "AstraMix AI Backend"
    app_version: str = "1.0.0"
    debug: bool = False

    # --- Model artifacts ---
    model_dir: Path = Path("models")
    strength_model_filename: str = "strength_model.pkl"

    # --- Optimization defaults ---
    optimizer_max_iterations: int = 500
    optimizer_timeout_seconds: int = 30

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
    def strength_model_path(self) -> Path:
        return self.model_dir / self.strength_model_filename

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance (loaded once per process)."""
    return Settings()
