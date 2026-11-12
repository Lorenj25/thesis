"""
Authentication and instructor email-verification routes.
"""

from __future__ import annotations

import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.email_service import EmailDeliveryError, send_verification_email
from backend.models import EmailVerificationToken, Instructor
from backend.schemas import (
    InstructorCreate,
    InstructorLogin,
    Token,
    VerificationMessage,
    VerificationRequest,
)
from backend.security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    create_access_token,
    get_password_hash,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])
VERIFICATION_TOKEN_LIFETIME = timedelta(hours=24)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _token_digest(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _issue_verification_email(
    instructor: Instructor,
    request: Request,
    db: Session,
) -> None:
    db.query(EmailVerificationToken).filter(
        EmailVerificationToken.instructor_id == instructor.id
    ).delete(synchronize_session=False)
    token = secrets.token_urlsafe(32)
    db.add(
        EmailVerificationToken(
            instructor_id=instructor.id,
            token_hash=_token_digest(token),
            expires_at=_utc_now() + VERIFICATION_TOKEN_LIFETIME,
        )
    )
    db.commit()

    api_base_url = os.getenv("API_PUBLIC_URL", "").strip().rstrip("/")
    if not api_base_url:
        api_base_url = str(request.base_url).rstrip("/")
    verification_url = f"{api_base_url}/auth/verify?token={token}"
    try:
        send_verification_email(instructor.email, instructor.name, verification_url)
    except EmailDeliveryError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc


@router.post(
    "/register",
    response_model=VerificationMessage,
    status_code=status.HTTP_201_CREATED,
)
def register_instructor(
    payload: InstructorCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> VerificationMessage:
    """Create an instructor account and send its confirmation email."""
    email = str(payload.email).lower().strip()
    existing = db.query(Instructor).filter(func.lower(Instructor.email) == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    new_instructor = Instructor(
        name=payload.name.strip(),
        email=email,
        password_hash=get_password_hash(payload.password),
        is_verified=False,
    )
    db.add(new_instructor)
    try:
        db.flush()
        _issue_verification_email(new_instructor, request, db)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        ) from exc

    return VerificationMessage(
        message="Account created. Check your email to confirm your account before signing in."
    )


@router.post("/resend-verification", response_model=VerificationMessage)
def resend_verification(
    payload: VerificationRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> VerificationMessage:
    """Resend confirmation for an existing unverified account."""
    email = str(payload.email).lower().strip()
    instructor = db.query(Instructor).filter(func.lower(Instructor.email) == email).first()
    if instructor and not instructor.is_verified:
        _issue_verification_email(instructor, request, db)
    return VerificationMessage(
        message="If this account needs confirmation, a verification email has been sent."
    )


@router.get("/verify", response_class=HTMLResponse)
def verify_instructor_email(
    token: str,
    db: Session = Depends(get_db),
) -> HTMLResponse:
    """Validate a single-use, time-limited confirmation token."""
    verification = (
        db.query(EmailVerificationToken)
        .filter(EmailVerificationToken.token_hash == _token_digest(token))
        .first()
    )
    if verification is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This confirmation link is invalid or has already been used.",
        )
    if verification.expires_at <= _utc_now():
        db.delete(verification)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This confirmation link has expired. Request a new one.",
        )

    instructor = db.query(Instructor).filter(
        Instructor.id == verification.instructor_id
    ).first()
    if instructor is None:
        db.delete(verification)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This confirmation link is no longer valid.",
        )

    instructor.is_verified = True
    db.query(EmailVerificationToken).filter(
        EmailVerificationToken.instructor_id == instructor.id
    ).delete(synchronize_session=False)
    db.commit()
    return HTMLResponse(
        "<!doctype html><html><head><title>Email confirmed</title></head>"
        "<body><h1>Email confirmed</h1>"
        "<p>Your instructor account is verified. You can now sign in.</p></body></html>"
    )


def _authenticate(email: str, password: str, db: Session) -> dict:
    instructor = db.query(Instructor).filter(func.lower(Instructor.email) == email).first()
    if not instructor or not verify_password(password, instructor.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not instructor.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please confirm your email before signing in.",
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
