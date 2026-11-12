"""
Database configuration and session management for CodeAuthentic.
SQLAlchemy 2.x with PostgreSQL (and testing fallback support).
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Generator
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
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
    Migrates legacy table names into an archive, then creates the current schema.
    """
    from backend import models  # noqa: F401

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    model_tables = ("instructors", "lobbies", "submissions")
    legacy_tables = []
    for table_name in model_tables:
        if table_name not in existing_tables:
            continue
        existing_columns = {
            column["name"] for column in inspector.get_columns(table_name)
        }
        expected_columns = set(Base.metadata.tables[table_name].columns.keys())
        if not expected_columns.issubset(existing_columns):
            legacy_tables.append(table_name)

    if legacy_tables:
        if engine.dialect.name != "postgresql":
            raise RuntimeError(
                "The database contains legacy application tables. "
                "Automatic archival migration is currently supported for PostgreSQL."
            )
        if os.getenv("ALLOW_LEGACY_SCHEMA_MIGRATION", "").strip().lower() != "true":
            raise RuntimeError(
                "The database contains legacy application tables. The migration is "
                "data-preserving but requires explicit approval; back up the database, "
                "then set ALLOW_LEGACY_SCHEMA_MIGRATION=true to run it."
            )

        archive_suffix = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        archived_instructors = None
        with engine.begin() as connection:
            current_tables = set(inspect(connection).get_table_names())
            identifier_preparer = connection.dialect.identifier_preparer
            for table_name in ("submissions", "lobbies", "instructors"):
                if table_name not in current_tables:
                    continue
                archive_name = f"{table_name}_legacy_{archive_suffix}"
                while archive_name in current_tables:
                    archive_suffix = f"{int(archive_suffix) + 1}"
                    archive_name = f"{table_name}_legacy_{archive_suffix}"

                existing_indexes = connection.execute(
                    text(
                        "SELECT indexname FROM pg_indexes "
                        "WHERE schemaname = current_schema() AND tablename = :table_name"
                    ),
                    {"table_name": table_name},
                ).scalars()
                for index_name in existing_indexes:
                    suffix = f"_legacy_{archive_suffix}"
                    archived_index_name = (
                        f"{index_name[: 63 - len(suffix)]}{suffix}"
                    )
                    connection.execute(
                        text(
                            "ALTER INDEX "
                            f"{identifier_preparer.quote(index_name)} RENAME TO "
                            f"{identifier_preparer.quote(archived_index_name)}"
                        )
                    )

                sequence_name = f"{table_name}_id_seq"
                if sequence_name in inspect(connection).get_sequence_names():
                    suffix = f"_legacy_{archive_suffix}"
                    archived_sequence_name = (
                        f"{sequence_name[: 63 - len(suffix)]}{suffix}"
                    )
                    connection.execute(
                        text(
                            "ALTER SEQUENCE "
                            f"{identifier_preparer.quote(sequence_name)} RENAME TO "
                            f"{identifier_preparer.quote(archived_sequence_name)}"
                        )
                    )

                connection.execute(
                    text(
                        "ALTER TABLE "
                        f"{identifier_preparer.quote(table_name)} RENAME TO "
                        f"{identifier_preparer.quote(archive_name)}"
                    )
                )
                current_tables.remove(table_name)
                current_tables.add(archive_name)
                if table_name == "instructors":
                    archived_instructors = archive_name

            Base.metadata.create_all(bind=connection)

            if archived_instructors:
                archived_columns = {
                    column["name"]
                    for column in inspect(connection).get_columns(archived_instructors)
                }
                name_column = "username" if "username" in archived_columns else "name"
                password_column = (
                    "hashed_password"
                    if "hashed_password" in archived_columns
                    else "password_hash"
                )
                if not {name_column, password_column, "email"}.issubset(archived_columns):
                    raise RuntimeError(
                        f"Cannot migrate accounts from {archived_instructors}: "
                        "required name, email, or password hash columns are missing."
                    )

                created_at_sql = (
                    'COALESCE(created_at, CURRENT_TIMESTAMP)'
                    if "created_at" in archived_columns
                    else "CURRENT_TIMESTAMP"
                )
                verified_sql = "is_verified" if "is_verified" in archived_columns else "TRUE"
                connection.execute(
                    text(
                        'INSERT INTO instructors '
                        '(id, name, email, password_hash, created_at, is_verified) '
                        f'SELECT id, "{name_column}", lower(email), "{password_column}", '
                        f'{created_at_sql}, {verified_sql} FROM "{archived_instructors}" '
                        "ON CONFLICT DO NOTHING"
                    )
                )
                connection.execute(
                    text(
                        "SELECT setval(pg_get_serial_sequence('instructors', 'id'), "
                        "COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM instructors"
                    )
                )

        print(
            "[INFO] Archived incompatible tables and preserved instructor accounts: "
            + ", ".join(legacy_tables)
        )
    else:
        Base.metadata.create_all(bind=engine)

    inspector = inspect(engine)
    for table_name in Base.metadata.tables:
        if table_name not in inspector.get_table_names():
            raise RuntimeError(f"Database migration did not create table '{table_name}'.")
        actual_columns = {
            column["name"] for column in inspector.get_columns(table_name)
        }
        missing_columns = set(Base.metadata.tables[table_name].columns.keys()) - actual_columns
        if missing_columns:
            raise RuntimeError(
                f"Database table '{table_name}' is missing columns: "
                + ", ".join(sorted(missing_columns))
            )

    print("[INFO] Database tables verified/created successfully.")
