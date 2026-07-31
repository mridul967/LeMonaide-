"""
Database ORM models for LeMonaide EvidenceOps core entities.
"""

from datetime import datetime
import uuid
from typing import Optional
from sqlalchemy import DateTime, String, Text, JSON, Float
from sqlalchemy.orm import Mapped, mapped_column

from db.session import Base


def generate_uuid() -> str:
    """Utility to generate string UUIDs for primary keys."""
    return str(uuid.uuid4())


class Project(Base):
    """Represents an ML research project workspace."""
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    task_type: Mapped[str] = mapped_column(String(64), default="binary_classification")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DatasetRecord(Base):
    """Represents a dataset version record within a project."""
    __tablename__ = "datasets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    version: Mapped[str] = mapped_column(String(64), default="v1.0")
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    checksum: Mapped[str] = mapped_column(String(64), nullable=False)
    profile_summary: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RunRecord(Base):
    """Represents an ML training or evaluation run."""
    __tablename__ = "run_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    dataset_id: Mapped[str] = mapped_column(String(36), nullable=False)
    model_family: Mapped[str] = mapped_column(String(64), nullable=False)
    hyperparameters: Mapped[dict] = mapped_column(JSON, default=dict)
    metrics: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(32), default="completed")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class FailureObservation(Base):
    """Represents a discovered model failure slice or anomaly."""
    __tablename__ = "failure_observations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    run_id: Mapped[str] = mapped_column(String(36), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slice_definition: Mapped[dict] = mapped_column(JSON, default=dict)
    impact_metric_delta: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Hypothesis(Base):
    """Represents a testable causal hypothesis for model repair."""
    __tablename__ = "hypotheses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    observation_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    mechanism: Mapped[str] = mapped_column(Text, nullable=False)
    expected_direction: Mapped[str] = mapped_column(String(32), default="maximize")
    status: Mapped[str] = mapped_column(String(32), default="unverified")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EvidenceClaim(Base):
    """Represents an append-only verified experimental claim."""
    __tablename__ = "evidence_claims"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    hypothesis_id: Mapped[str] = mapped_column(String(36), nullable=False)
    claim_text: Mapped[str] = mapped_column(Text, nullable=False)
    verdict: Mapped[str] = mapped_column(String(32), default="verified")
    effect_summary: Mapped[dict] = mapped_column(JSON, default=dict)
    immutable_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
