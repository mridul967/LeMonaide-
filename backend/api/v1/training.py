"""
Training API endpoints for configuring, launching, SSE progress streaming, and inspecting ML runs.
"""

import asyncio
import json
from pathlib import Path
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from config.settings import Settings, get_settings
from db.models import DatasetRecord, RunRecord
from db.session import get_db_session
from services.trainer import train_baseline_model

router = APIRouter(tags=["training"])


class TrainRequestSchema(BaseModel):
    """Schema for launching a model training run."""
    dataset_id: str
    model_family: str = "random_forest"
    hyperparameters: Dict[str, Any] = {}


class RunResponseSchema(BaseModel):
    """Response schema for run records."""
    id: str
    project_id: str
    dataset_id: str
    model_family: str
    hyperparameters: dict
    metrics: dict
    status: str
    created_at: str

    model_config = ConfigDict(from_attributes=True)


@router.get("/projects/{project_id}/runs", response_model=List[RunResponseSchema], summary="List training runs")
async def list_runs(project_id: str, session: AsyncSession = Depends(get_db_session)) -> List[RunResponseSchema]:
    """Lists all completed training runs for a project."""
    result = await session.execute(
        select(RunRecord).where(RunRecord.project_id == project_id).order_by(RunRecord.created_at.desc())
    )
    runs = result.scalars().all()
    return [
        RunResponseSchema(
            id=r.id,
            project_id=r.project_id,
            dataset_id=r.dataset_id,
            model_family=r.model_family,
            hyperparameters=r.hyperparameters,
            metrics=r.metrics,
            status=r.status,
            created_at=r.created_at.isoformat(),
        )
        for r in runs
    ]


@router.get("/projects/{project_id}/train/stream", summary="Stream live training execution logs via SSE")
async def stream_training_progress(project_id: str, model_family: str = "random_forest"):
    """Streams live step-by-step training progress events to the frontend via SSE."""
    async def event_generator():
        steps = [
            {"step": "1/4", "message": f"Initializing pipeline for model family '{model_family}'...", "progress": 25},
            {"step": "2/4", "message": "Ingesting data file & encoding categorical features...", "progress": 50},
            {"step": "3/4", "message": "Executing 80/20 train/test split & fitting estimator...", "progress": 75},
            {"step": "4/4", "message": "Evaluating accuracy, log loss & per-sample error slices...", "progress": 100},
        ]
        for item in steps:
            await asyncio.sleep(0.3)
            yield f"data: {json.dumps(item)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/projects/{project_id}/train", response_model=RunResponseSchema, status_code=status.HTTP_201_CREATED, summary="Execute model training run")
async def execute_training(
    project_id: str,
    payload: TrainRequestSchema,
    session: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
) -> RunResponseSchema:
    """Executes a baseline ML training run on specified dataset."""
    result = await session.execute(select(DatasetRecord).where(DatasetRecord.id == payload.dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Dataset '{payload.dataset_id}' not found.")

    file_path = Path(dataset.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Dataset file '{file_path}' does not exist on disk.")

    model_dir = settings.root_dir / "data" / "models" / project_id

    try:
        metrics, importances, predictions = train_baseline_model(
            file_path=file_path,
            model_family=payload.model_family,
            hyperparameters=payload.hyperparameters,
            save_dir=model_dir,
        )
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))

    run_payload_metrics = {
        **metrics,
        "feature_importances": importances,
        "per_sample_predictions": predictions[:100],
    }

    run_record = RunRecord(
        project_id=project_id,
        dataset_id=payload.dataset_id,
        model_family=payload.model_family,
        hyperparameters=payload.hyperparameters,
        metrics=run_payload_metrics,
        status="completed",
    )

    session.add(run_record)
    await session.commit()
    await session.refresh(run_record)

    return RunResponseSchema(
        id=run_record.id,
        project_id=run_record.project_id,
        dataset_id=run_record.dataset_id,
        model_family=run_record.model_family,
        hyperparameters=run_record.hyperparameters,
        metrics=run_record.metrics,
        status=run_record.status,
        created_at=run_record.created_at.isoformat(),
    )
