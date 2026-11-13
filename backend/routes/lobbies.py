"""
Lobby management routes for instructors and public lobby status query.
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone
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


def _shareable_lobby_url(request: Request, lobby_id: uuid.UUID) -> str:
    """Builds a student URL using the configured public origin when available."""
    base_url = os.getenv("PUBLIC_BASE_URL", "").strip().rstrip("/")
    if not base_url:
        base_url = str(request.base_url).rstrip("/")
    return f"{base_url}/lobby/{lobby_id}"


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
        id=str(uuid.uuid4()),
        instructor_id=current_instructor.id,
        subject=payload.subject.strip(),
        title=payload.title.strip(),
        language=payload.language,
        max_students=payload.max_students,
        status="ACTIVE",
        created_at=now,
        expires_at=expires_at,
    )
    db.add(lobby)
    db.commit()
    db.refresh(lobby)

    # Construct shareable URL
    shareable_url = _shareable_lobby_url(request, lobby.id)

    return LobbyResponse(
        id=lobby.id,
        instructor_id=lobby.instructor_id,
        subject=lobby.subject,
        title=lobby.title,
        language=lobby.language,
        max_students=lobby.max_students,
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
                subject=lobby.subject,
                title=lobby.title,
                language=lobby.language,
                max_students=lobby.max_students,
                status=lobby.status,
                created_at=lobby.created_at,
                expires_at=lobby.expires_at,
                shareable_url=_shareable_lobby_url(request, lobby.id),
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
    lobby = db.query(Lobby).filter(Lobby.id == str(lobby_id)).first()
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

    return LobbyDetailResponse(
        id=lobby.id,
        instructor_id=lobby.instructor_id,
        subject=lobby.subject,
        title=lobby.title,
        language=lobby.language,
        max_students=lobby.max_students,
        status=lobby.status,
        created_at=lobby.created_at,
        expires_at=lobby.expires_at,
        shareable_url=_shareable_lobby_url(request, lobby.id),
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
    lobby = db.query(Lobby).filter(Lobby.id == str(lobby_id)).first()
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

    return LobbyResponse(
        id=lobby.id,
        instructor_id=lobby.instructor_id,
        subject=lobby.subject,
        title=lobby.title,
        language=lobby.language,
        max_students=lobby.max_students,
        status=lobby.status,
        created_at=lobby.created_at,
        expires_at=lobby.expires_at,
        shareable_url=_shareable_lobby_url(request, lobby.id),
    )


@router.post("/lobbies/{lobby_id}/unlock", response_model=LobbyResponse)
def unlock_lobby(
    lobby_id: uuid.UUID,
    request: Request,
    current_instructor: Instructor = Depends(get_current_instructor),
    db: Session = Depends(get_db),
) -> LobbyResponse:
    """Reopens an owned lobby only while its configured duration remains active."""
    lobby = db.query(Lobby).filter(Lobby.id == str(lobby_id)).first()
    if not lobby:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lobby not found")

    if lobby.instructor_id != current_instructor.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this lobby.",
        )

    if datetime.now(timezone.utc).replace(tzinfo=None) >= lobby.expires_at:
        lobby.status = "LOCKED"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This lobby has expired and cannot be reopened.",
        )

    lobby.status = "ACTIVE"
    db.commit()
    db.refresh(lobby)

    return LobbyResponse(
        id=lobby.id,
        instructor_id=lobby.instructor_id,
        subject=lobby.subject,
        title=lobby.title,
        language=lobby.language,
        max_students=lobby.max_students,
        status=lobby.status,
        created_at=lobby.created_at,
        expires_at=lobby.expires_at,
        shareable_url=_shareable_lobby_url(request, lobby.id),
    )


@router.delete("/lobbies/{lobby_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lobby(
    lobby_id: uuid.UUID,
    current_instructor: Instructor = Depends(get_current_instructor),
    db: Session = Depends(get_db),
) -> None:
    """Deletes an owned lobby and its related submissions."""
    lobby = db.query(Lobby).filter(Lobby.id == str(lobby_id)).first()
    if not lobby:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lobby not found")

    if lobby.instructor_id != current_instructor.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this lobby.",
        )

    db.delete(lobby)
    db.commit()


@router.get("/public/lobbies/{lobby_id}/status", response_model=LobbyPublicStatus)
def get_public_lobby_status(
    lobby_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> LobbyPublicStatus:
    """
    Public endpoint for student portal check.
    Returns ONLY active flag and title. Never returns submissions or scores.
    """
    lobby = db.query(Lobby).filter(Lobby.id == str(lobby_id)).first()
    if not lobby:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lobby not found")

    # If expired, mark LOCKED
    if lobby.status == "ACTIVE" and datetime.utcnow() >= lobby.expires_at:
        lobby.status = "LOCKED"
        db.commit()

    is_active = lobby.status == "ACTIVE" and datetime.utcnow() < lobby.expires_at
    return LobbyPublicStatus(
        active=is_active,
        subject=lobby.subject,
        title=lobby.title,
        language=lobby.language,
    )
