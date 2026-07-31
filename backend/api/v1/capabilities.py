"""
Capabilities API endpoints delivering dynamic runtime settings, catalogs, and schemas.
Enforces the Zero Hardcoded Domain Values principle.
"""

from typing import Any, Dict
from fastapi import APIRouter, Depends

from config.settings import Settings, get_settings

router = APIRouter(tags=["capabilities"])


@router.get("/capabilities", summary="Get runtime capabilities")
async def get_capabilities(
    settings: Settings = Depends(get_settings),
) -> Dict[str, Any]:
    """Returns dynamic backend capability configuration loaded from system settings."""
    base_config = settings.load_base_config()
    return {
        "app_name": settings.app_name,
        "environment": settings.app_environment,
        "api_prefix": settings.api_prefix,
        "capabilities": base_config.get("capabilities", {}),
    }


@router.get("/ui-config", summary="Get dynamic UI configuration")
async def get_ui_config(
    settings: Settings = Depends(get_settings),
) -> Dict[str, Any]:
    """Returns frontend UI configurations, themes, and feature configurations."""
    base_config = settings.load_base_config()
    return {
        "theme": base_config.get("ui", {}).get("theme", "citrus-noir"),
        "ports": base_config.get("ui", {}).get("ports", {"frontend": 3741, "backend": 8741}),
        "feature_flags": {
            "enable_failure_lab": True,
            "enable_budget_intelligence": True,
            "enable_evidence_graph": True,
            "enable_cross_project_memory": True,
        },
    }
