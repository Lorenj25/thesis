"""
Database configuration and session management for CodeAuthentic.
SQLAlchemy 2.x with PostgreSQL (and testing fallback support).
"""

from __future__ import annotations

import os
from typing import Generator
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session

# Load environment variables from .env file
load_dotenv()

# Read database URL, defaulting to local PostgreSQL instance
RAW_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/codeauthentic",
)

def normalize_database_url(url: str) -> str:
    """
    Normalizes PostgreSQL connection strings to explicitly select the installed driver.
    Prevents 'ModuleNotFoundError: No module named psycopg' in SQLAlchemy 2.x
    when psycopg2-binary is installed instead of psycopg 3.
    """
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]

    if url.startswith("postgresql://") and not url.startswith("postgresql+"):
        try:
            import psycopg2  # noqa: F401
            return url.replace("postgresql://", "postgresql+psycopg2://", 1)
        except ImportError:
            try:
                import psycopg  # noqa: F401
                return url.replace("postgresql://", "postgresql+psycopg://", 1)
            except ImportError:
                return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url

DATABASE_URL = normalize_database_url(RAW_DATABASE_URL)

# Engine configuration (handling SQLite vs PostgreSQL parameters)
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
engine_kwargs = {
    "pool_pre_ping": True,
}
if "sqlite" not in DATABASE_URL:
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

# Create SQLAlchemy Engine
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    **engine_kwargs,
)

# Session factory for generating database sessions
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# Base class for all SQLAlchemy declarative models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency yielding a SQLAlchemy database session.
    Automatically closes session after request finishes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_connection() -> bool:
    """
    Tests connectivity to the configured database.
    Returns True if connection succeeded, False otherwise.
    """
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1")).scalar()
            return result == 1
    except Exception as exc:
        print(f"[ERROR] Database connection failed: {exc}")
        return False


def create_tables() -> None:
    """
    Creates all defined database tables if they do not already exist.
    """
    # Import models to ensure they are registered with Base.metadata
    from backend import models  # noqa: F401

    try:
        Base.metadata.create_all(bind=engine)
        print("[INFO] Database tables verified/created successfully.")
    except Exception as exc:
        print(f"[WARNING] Could not initialize database tables: {exc}")
