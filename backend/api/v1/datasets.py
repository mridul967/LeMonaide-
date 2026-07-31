"""
Dataset API endpoints for upload, profiling, and synthetic demo dataset generation.
"""

from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, ConfigDict
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from config.settings import Settings, get_settings
from db.models import DatasetRecord, Project
from db.session import get_db_session
from services.profiler import compute_file_sha256, generate_synthetic_churn_dataset, profile_dataframe

router = APIRouter(tags=["datasets"])


class DatasetResponseSchema(BaseModel):
    """Response schema for dataset metadata and statistical profile."""
    id: str
    project_id: str
    name: str
    version: str
    file_path: str
    checksum: str
    profile_summary: Optional[dict] = None
    created_at: str

    model_config = ConfigDict(from_attributes=True)


def _get_upload_dir(project_id: str, settings: Settings) -> Path:
    """Ensures and returns target project upload directory."""
    upload_dir = settings.root_dir / "data" / "uploads" / project_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


@router.get(
    "/projects/{project_id}/datasets",
    response_model=List[DatasetResponseSchema],
    summary="List project datasets",
)
async def list_datasets(
    project_id: str,
    session: AsyncSession = Depends(get_db_session),
) -> List[DatasetResponseSchema]:
    """Lists all datasets associated with a project."""
    result = await session.execute(
        select(DatasetRecord)
        .where(DatasetRecord.project_id == project_id)
        .order_by(DatasetRecord.created_at.desc())
    )
    datasets = result.scalars().all()
    return [
        DatasetResponseSchema(
            id=d.id,
            project_id=d.project_id,
            name=d.name,
            version=d.version,
            file_path=d.file_path,
            checksum=d.checksum,
            profile_summary=d.profile_summary,
            created_at=d.created_at.isoformat(),
        )
        for d in datasets
    ]


@router.post(
    "/projects/{project_id}/datasets/upload",
    response_model=DatasetResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and profile dataset",
)
async def upload_dataset(
    project_id: str,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
) -> DatasetResponseSchema:
    """Ingests, fingerprints, profiles, and saves a user-uploaded CSV or Parquet file."""
    upload_dir = _get_upload_dir(project_id, settings)
    filename = file.filename or "uploaded_dataset.csv"
    temp_path = upload_dir / f"tmp_{filename}"

    with open(temp_path, "wb") as f:
        content = await file.read()
        f.write(content)

    checksum = compute_file_sha256(temp_path)
    final_path = upload_dir / f"{checksum[:12]}_{filename}"
    temp_path.rename(final_path)

    try:
        df = pd.read_parquet(final_path) if filename.endswith(".parquet") else pd.read_csv(final_path)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse data file: {str(e)}",
        )

    profile = profile_dataframe(df)

    dataset = DatasetRecord(
        project_id=project_id,
        name=filename,
        version="v1.0",
        file_path=str(final_path),
        checksum=checksum,
        profile_summary=profile,
    )
    session.add(dataset)
    await session.commit()
    await session.refresh(dataset)

    return DatasetResponseSchema(
        id=dataset.id,
        project_id=dataset.project_id,
        name=dataset.name,
        version=dataset.version,
        file_path=dataset.file_path,
        checksum=dataset.checksum,
        profile_summary=dataset.profile_summary,
        created_at=dataset.created_at.isoformat(),
    )


@router.post(
    "/projects/{project_id}/datasets/seed-demo",
    response_model=DatasetResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Generate synthetic failure laboratory demo dataset",
)
async def seed_demo_dataset(
    project_id: str,
    session: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
) -> DatasetResponseSchema:
    """Generates synthetic benchmark customer churn dataset with an engineered failure slice."""
    upload_dir = _get_upload_dir(project_id, settings)
    df = generate_synthetic_churn_dataset(n_samples=1000)

    filename = "demo_telecom_churn.csv"
    save_path = upload_dir / filename
    df.to_csv(save_path, index=False)

    checksum = compute_file_sha256(save_path)
    profile = profile_dataframe(df)

    dataset = DatasetRecord(
        project_id=project_id,
        name="Demo Telecom Churn (Failure Lab Dataset)",
        version="v1.0-demo",
        file_path=str(save_path),
        checksum=checksum,
        profile_summary=profile,
    )
    session.add(dataset)
    await session.commit()
    await session.refresh(dataset)

    return DatasetResponseSchema(
        id=dataset.id,
        project_id=dataset.project_id,
        name=dataset.name,
        version=dataset.version,
        file_path=dataset.file_path,
        checksum=dataset.checksum,
        profile_summary=dataset.profile_summary,
        created_at=dataset.created_at.isoformat(),
    )
