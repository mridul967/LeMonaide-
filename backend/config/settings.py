"""
Settings module for LeMonaide backend configuration.
Loads YAML configuration files and environment overrides.
"""

from functools import lru_cache
from pathlib import Path
from typing import Any, Dict
import yaml

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with defaults and environment variable support."""

    app_name: str = "lemonaide"
    app_environment: str = "development"
    api_prefix: str = "/api/v1"

    # SQLite Database stored at project root
    database_url: str = "sqlite+aiosqlite:////Users/vinodpandey/LeMonaide🍋/lemonaide.db"
    
    # Root path references
    root_dir: Path = Path(__file__).resolve().parent.parent.parent
    config_file: Path = Path(__file__).resolve().parent.parent.parent / "configs" / "base.yaml"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    def load_base_config(self) -> Dict[str, Any]:
        """Loads and parses the base YAML configuration file."""
        if not self.config_file.exists():
            return {}
        with open(self.config_file, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}


@lru_cache
def get_settings() -> Settings:
    """Returns cached application settings instance."""
    return Settings()
