"""
Authentication routes for instructors.
Endpoints:
- POST /auth/register
- POST /auth/login
"""

from __future__ import annotations

from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
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


@router.post("/register", response_model=InstructorResponse, status_code=status.HTTP_201_CREATED)
def register_instructor(payload: InstructorCreate, db: Session = Depends(get_db)) -> Instructor:
    """
    Registers a new instructor account with a hashed password.
    Enforces unique email constraint.
    """
    existing = db.query(Instructor).filter(Instructor.email == payload.email.lower().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    hashed_pw = get_password_hash(payload.password)
    new_instructor = Instructor(
        name=payload.name.strip(),
        email=payload.email.lower().strip(),
        password_hash=hashed_pw,
    )
    db.add(new_instructor)
    db.commit()
    db.refresh(new_instructor)
    return new_instructor


@router.post("/login", response_model=Token)
def login_instructor(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> dict:
    """
    Logs in an instructor using OAuth2 form data (username=email, password).
    Returns a JWT access token upon successful authentication.
    """
    email = form_data.username.lower().strip()
    instructor = db.query(Instructor).filter(Instructor.email == email).first()

    if not instructor or not verify_password(form_data.password, instructor.password_hash):
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


@router.post("/login/json", response_model=Token)
def login_instructor_json(
    payload: InstructorLogin,
    db: Session = Depends(get_db),
) -> dict:
    """
    Alternative JSON login endpoint for frontend requests.
    """
    email = payload.email.lower().strip()
    instructor = db.query(Instructor).filter(Instructor.email == email).first()

    if not instructor or not verify_password(payload.password, instructor.password_hash):
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
