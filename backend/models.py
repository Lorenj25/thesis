"""
SQLAlchemy ORM models for CodeAuthentic:
- Instructor: authenticated faculty accounts
- Lobby: timed exam sessions created by instructors
- Submission: code submissions uploaded by students for AI-generation analysis
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Uuid,
)
from sqlalchemy.orm import relationship

from backend.database import Base


class Instructor(Base):
    """
    Instructor account model.
    Instructors create and manage exam lobbies and monitor student submissions.
    """
    __tablename__ = "instructors"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    lobbies = relationship(
        "Lobby",
        back_populates="instructor",
        cascade="all, delete-orphan",
        order_by="desc(Lobby.created_at)",
    )

    def __repr__(self) -> str:
        return f"<Instructor(id={self.id}, name='{self.name}', email='{self.email}')>"


class Lobby(Base):
    """
    Exam lobby session model.
    A lobby represents an active or locked examination window with a unique UUID.
    """
    __tablename__ = "lobbies"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    instructor_id = Column(
        Integer,
        ForeignKey("instructors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(255), nullable=False)
    status = Column(String(20), default="ACTIVE", nullable=False)  # ACTIVE | LOCKED
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)

    # Relationships
    instructor = relationship("Instructor", back_populates="lobbies")
    submissions = relationship(
        "Submission",
        back_populates="lobby",
        cascade="all, delete-orphan",
        order_by="desc(Submission.created_at)",
    )

    @property
    def is_active(self) -> bool:
        """Checks if lobby is marked ACTIVE and has not yet reached its expiration."""
        return self.status == "ACTIVE" and datetime.utcnow() < self.expires_at

    def __repr__(self) -> str:
        return f"<Lobby(id={self.id}, title='{self.title}', status='{self.status}')>"


class Submission(Base):
    """
    Student source code submission model.
    Stores metadata, source code, and CodeBERT AI analysis results.
    """
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    lobby_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("lobbies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    student_id = Column(String(50), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    language = Column(String(20), nullable=False)  # c | java | python
    source_code = Column(Text, nullable=False)
    status = Column(String(20), default="pending", nullable=False)  # pending | done | failed
    ai_probability = Column(Float, nullable=True)  # 0.0 to 1.0 (nullable until done)
    risk_level = Column(String(20), nullable=True)  # Low | Medium | High
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    lobby = relationship("Lobby", back_populates="submissions")

    # Composite index for fast counting of student files per lobby (rule: max 3)
    __table_args__ = (
        Index("ix_submissions_lobby_student", "lobby_id", "student_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<Submission(id={self.id}, student='{self.student_id}', file='{self.file_name}', "
            f"lang='{self.language}', status='{self.status}', ai_prob={self.ai_probability})>"
        )
