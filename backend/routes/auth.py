"""
Authentication routes for instructors.
"""

from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Instructor
from backend.schemas import InstructorCreate, InstructorLogin, InstructorResponse, Token
from backend.security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    create_access_token,
    get_password_hash,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=InstructorResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_instructor(
    payload: InstructorCreate,
    db: Session = Depends(get_db),
) -> Instructor:
    """Create an instructor account that can sign in immediately."""
    email = str(payload.email).lower().strip()
    existing = db.query(Instructor).filter(func.lower(Instructor.email) == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    instructor = Instructor(
        name=payload.name.strip(),
        email=email,
        password_hash=get_password_hash(payload.password),
        is_verified=True,
    )
    db.add(instructor)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        ) from exc

    db.refresh(instructor)
    return instructor


def _authenticate(email: str, password: str, db: Session) -> dict:
    instructor = db.query(Instructor).filter(func.lower(Instructor.email) == email).first()
    if not instructor or not verify_password(password, instructor.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        data={"sub": instructor.email, "instructor_id": instructor.id},
        expires_delta=access_token_expires,
    )
    return {"access_token": token, "token_type": "bearer"}


@router.post("/login", response_model=Token)
def login_instructor(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> dict:
    """OAuth2 form-based sign in."""
    return _authenticate(
        form_data.username.lower().strip(),
        form_data.password,
        db,
    )


@router.post("/login/json", response_model=Token)
def login_instructor_json(
    payload: InstructorLogin,
    db: Session = Depends(get_db),
) -> dict:
    """JSON sign in for the React frontend."""
    return _authenticate(str(payload.email).lower().strip(), payload.password, db)
