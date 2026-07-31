"""
FastAPI application entrypoint for LeMonaide EvidenceOps backend.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.v1.router import api_v1_router
from config.settings import get_settings
from db.session import Base, engine

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan context manager creating database tables on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="LeMonaide EvidenceOps API",
    description="Autonomous ML research & MLOps platform backend engine.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS configuration targeting local frontend
origins = [
    "http://127.0.0.1:3741",
    "http://localhost:3741",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1_router)


@app.get("/health", summary="Healthcheck endpoint")
async def healthcheck():
    """Basic healthcheck endpoint."""
    return {"status": "healthy", "app": settings.app_name}
