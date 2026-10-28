"""
Pydantic schemas for request validation and response serialization.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, List, Optional
from pydantic import BaseModel, Field, StringConstraints

try:
    import email_validator  # noqa: F401
    from pydantic import EmailStr
except ImportError:
    # Resilient fallback if email-validator is not installed
    EmailStr = Annotated[str, StringConstraints(pattern=r"^[\w\.\+\-]+@[a-zA-Z0-9\-]+\.[a-zA-Z0-9\-\.]+$")]

# ==============================================================================
# Authentication & Instructor Schemas
# ==============================================================================

class InstructorBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr


class InstructorCreate(InstructorBase):
    password: str = Field(..., min_length=6, max_length=100)


class InstructorLogin(BaseModel):
    email: EmailStr
    password: str


class InstructorResponse(InstructorBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    email: Optional[str] = None
    instructor_id: Optional[int] = None


# ==============================================================================
# Submission Schemas
# ==============================================================================

class SubmissionBase(BaseModel):
    student_id: str = Field(..., min_length=1, max_length=50)
    file_name: str = Field(..., min_length=1, max_length=255)
    language: str = Field(..., pattern="^(c|java|python)$")


class SubmissionResponse(SubmissionBase):
    id: int
    lobby_id: uuid.UUID
    status: str  # pending | done | failed
    ai_probability: Optional[float] = None
    risk_level: Optional[str] = None  # Low | Medium | High
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ==============================================================================
# Lobby Schemas
# ==============================================================================

class LobbyCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    duration_minutes: int = Field(..., ge=1, le=1440)  # Up to 24 hours


class LobbyResponse(BaseModel):
    id: uuid.UUID
    instructor_id: int
    title: str
    status: str  # ACTIVE | LOCKED
    created_at: datetime
    expires_at: datetime
    shareable_url: Optional[str] = None

    class Config:
        from_attributes = True


class LobbyDetailResponse(LobbyResponse):
    submissions: List[SubmissionResponse] = []

    class Config:
        from_attributes = True


class LobbyPublicStatus(BaseModel):
    active: bool
    title: str
