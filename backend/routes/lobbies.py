"""
Lobby management routes for instructors and public lobby status query.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Instructor, Lobby
from backend.schemas import (
    LobbyCreate,
    LobbyDetailResponse,
    LobbyPublicStatus,
    LobbyResponse,
)
from backend.security import get_current_instructor

router = APIRouter(tags=["Lobbies"])


@router.post("/lobbies", response_model=LobbyResponse, status_code=status.HTTP_201_CREATED)
def create_lobby(
    payload: LobbyCreate,
    request: Request,
    current_instructor: Instructor = Depends(get_current_instructor),
    db: Session = Depends(get_db),
) -> LobbyResponse:
    """
    Creates a new exam lobby for the logged-in instructor with a unique UUID.
    Sets expiration time based on duration_minutes.
    """
    now = datetime.utcnow()
    expires_at = now + timedelta(minutes=payload.duration_minutes)

    lobby = Lobby(
        id=uuid.uuid4(),
        instructor_id=current_instructor.id,
        title=payload.title.strip(),
        status="ACTIVE",
        created_at=now,
        expires_at=expires_at,
    )
    db.add(lobby)
    db.commit()
    db.refresh(lobby)

    # Construct shareable URL
    base_url = str(request.base_url).rstrip("/")
    shareable_url = f"{base_url}/lobby/{lobby.id}"

    response_data = LobbyResponse.from_attributes = True
    return LobbyResponse(
        id=lobby.id,
        instructor_id=lobby.instructor_id,
        title=lobby.title,
        status=lobby.status,
        created_at=lobby.created_at,
        expires_at=lobby.expires_at,
        shareable_url=shareable_url,
    )


@router.get("/lobbies", response_model=List[LobbyResponse])
def get_instructor_lobbies(
    request: Request,
    current_instructor: Instructor = Depends(get_current_instructor),
    db: Session = Depends(get_db),
) -> List[LobbyResponse]:
    """
    Returns all lobbies created by the authenticated instructor.
    Automatically checks and marks expired lobbies as LOCKED.
    """
    now = datetime.utcnow()
    lobbies = (
        db.query(Lobby)
        .filter(Lobby.instructor_id == current_instructor.id)
        .order_by(Lobby.created_at.desc())
        .all()
    )

    base_url = str(request.base_url).rstrip("/")
    result: List[LobbyResponse] = []

    for lobby in lobbies:
        # Check automatic expiration
        if lobby.status == "ACTIVE" and now >= lobby.expires_at:
            lobby.status = "LOCKED"
            db.commit()

        result.append(
            LobbyResponse(
                id=lobby.id,
                instructor_id=lobby.instructor_id,
                title=lobby.title,
                status=lobby.status,
                created_at=lobby.created_at,
                expires_at=lobby.expires_at,
                shareable_url=f"{base_url}/lobby/{lobby.id}",
            )
        )

    return result


@router.get("/lobbies/{lobby_id}", response_model=LobbyDetailResponse)
def get_lobby_detail(
    lobby_id: uuid.UUID,
    request: Request,
    current_instructor: Instructor = Depends(get_current_instructor),
    db: Session = Depends(get_db),
) -> LobbyDetailResponse:
    """
    Retrieves full lobby details including all student submissions.
    Enforces ownership check: instructors can only view their own lobbies.
    """
    lobby = db.query(Lobby).filter(Lobby.id == lobby_id).first()
    if not lobby:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lobby not found")

    if lobby.instructor_id != current_instructor.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this lobby.",
        )

    # Check auto-expiry
    if lobby.status == "ACTIVE" and datetime.utcnow() >= lobby.expires_at:
        lobby.status = "LOCKED"
        db.commit()

    base_url = str(request.base_url).rstrip("/")
    return LobbyDetailResponse(
        id=lobby.id,
        instructor_id=lobby.instructor_id,
        title=lobby.title,
        status=lobby.status,
        created_at=lobby.created_at,
        expires_at=lobby.expires_at,
        shareable_url=f"{base_url}/lobby/{lobby.id}",
        submissions=lobby.submissions,
    )


@router.post("/lobbies/{lobby_id}/lock", response_model=LobbyResponse)
def lock_lobby(
    lobby_id: uuid.UUID,
    request: Request,
    current_instructor: Instructor = Depends(get_current_instructor),
    db: Session = Depends(get_db),
) -> LobbyResponse:
    """
    Manually locks an active lobby session.
    """
    lobby = db.query(Lobby).filter(Lobby.id == lobby_id).first()
    if not lobby:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lobby not found")

    if lobby.instructor_id != current_instructor.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this lobby.",
        )

    lobby.status = "LOCKED"
    db.commit()
    db.refresh(lobby)

    base_url = str(request.base_url).rstrip("/")
    return LobbyResponse(
        id=lobby.id,
        instructor_id=lobby.instructor_id,
        title=lobby.title,
        status=lobby.status,
        created_at=lobby.created_at,
        expires_at=lobby.expires_at,
        shareable_url=f"{base_url}/lobby/{lobby.id}",
    )


@router.get("/public/lobbies/{lobby_id}/status", response_model=LobbyPublicStatus)
def get_public_lobby_status(
    lobby_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> LobbyPublicStatus:
    """
    Public endpoint for student portal check.
    Returns ONLY active flag and title. Never returns submissions or scores.
    """
    lobby = db.query(Lobby).filter(Lobby.id == lobby_id).first()
    if not lobby:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lobby not found")

    # If expired, mark LOCKED
    if lobby.status == "ACTIVE" and datetime.utcnow() >= lobby.expires_at:
        lobby.status = "LOCKED"
        db.commit()

    is_active = lobby.status == "ACTIVE" and datetime.utcnow() < lobby.expires_at
    return LobbyPublicStatus(active=is_active, title=lobby.title)
