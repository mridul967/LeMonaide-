"""
Project management API endpoints for LeMonaide workspaces.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from db.models import Project
from db.session import get_db_session

router = APIRouter(tags=["projects"])


class ProjectCreateSchema(BaseModel):
    """Schema for creating a new research project."""
    name: str
    description: Optional[str] = None
    task_type: str = "binary_classification"


class ProjectResponseSchema(BaseModel):
    """Response schema for a project entity."""
    id: str
    name: str
    description: Optional[str] = None
    task_type: str
    created_at: str

    model_config = ConfigDict(from_attributes=True)


@router.get("/projects", response_model=List[ProjectResponseSchema], summary="List projects")
async def list_projects(
    session: AsyncSession = Depends(get_db_session),
) -> List[ProjectResponseSchema]:
    """Lists all active research projects."""
    result = await session.execute(select(Project).order_by(Project.created_at.desc()))
    projects = result.scalars().all()
    return [
        ProjectResponseSchema(
            id=p.id,
            name=p.name,
            description=p.description,
            task_type=p.task_type,
            created_at=p.created_at.isoformat(),
        )
        for p in projects
    ]


@router.post(
    "/projects",
    response_model=ProjectResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create project",
)
async def create_project(
    payload: ProjectCreateSchema,
    session: AsyncSession = Depends(get_db_session),
) -> ProjectResponseSchema:
    """Creates a new project record."""
    project = Project(
        name=payload.name,
        description=payload.description,
        task_type=payload.task_type,
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return ProjectResponseSchema(
        id=project.id,
        name=project.name,
        description=project.description,
        task_type=project.task_type,
        created_at=project.created_at.isoformat(),
    )


@router.get(
    "/projects/{project_id}",
    response_model=ProjectResponseSchema,
    summary="Get project by ID",
)
async def get_project(
    project_id: str,
    session: AsyncSession = Depends(get_db_session),
) -> ProjectResponseSchema:
    """Retrieves a single project by primary key ID."""
    result = await session.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found.",
        )
    return ProjectResponseSchema(
        id=project.id,
        name=project.name,
        description=project.description,
        task_type=project.task_type,
        created_at=project.created_at.isoformat(),
    )
