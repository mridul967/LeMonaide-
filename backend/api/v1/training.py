"""
Training API endpoints for configuring, launching, and inspecting ML runs.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
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


@router.get(
    "/projects/{project_id}/runs",
    response_model=List[RunResponseSchema],
    summary="List training runs",
)
async def list_runs(
    project_id: str,
    session: AsyncSession = Depends(get_db_session),
) -> List[RunResponseSchema]:
    """Lists all completed training runs for a project."""
    result = await session.execute(
        select(RunRecord)
        .where(RunRecord.project_id == project_id)
        .order_by(RunRecord.created_at.desc())
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


@router.post(
    "/projects/{project_id}/train",
    response_model=RunResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Execute model training run",
)
async def execute_training(
    project_id: str,
    payload: TrainRequestSchema,
    session: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
) -> RunResponseSchema:
    """Executes a baseline ML training run on specified dataset."""
    result = await session.execute(
        select(DatasetRecord).where(DatasetRecord.id == payload.dataset_id)
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{payload.dataset_id}' not found.",
        )

    file_path = Path(dataset.file_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Dataset file '{file_path}' does not exist on disk.",
        )

    model_dir = settings.root_dir / "data" / "models" / project_id
    metrics, importances, predictions = train_baseline_model(
        file_path=file_path,
        model_family=payload.model_family,
        hyperparameters=payload.hyperparameters,
        save_dir=model_dir,
    )

    run_payload_metrics = {
        **metrics,
        "feature_importances": importances,
        "per_sample_predictions": predictions[:100],  # Cache sample evaluations
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


@router.get(
    "/projects/{project_id}/runs/{run_id}",
    response_model=RunResponseSchema,
    summary="Get run by ID",
)
async def get_run(
    project_id: str,
    run_id: str,
    session: AsyncSession = Depends(get_db_session),
) -> RunResponseSchema:
    """Retrieves a single run record by ID."""
    result = await session.execute(
        select(RunRecord).where(RunRecord.id == run_id, RunRecord.project_id == project_id)
    )
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run record '{run_id}' not found.",
        )
    return RunResponseSchema(
        id=run.id,
        project_id=run.project_id,
        dataset_id=run.dataset_id,
        model_family=run.model_family,
        hyperparameters=run.hyperparameters,
        metrics=run.metrics,
        status=run.status,
        created_at=run.created_at.isoformat(),
    )
