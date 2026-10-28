"""
Database connection and schema verification test script for CodeAuthentic.
Run with: python -m backend.test_db
"""

from __future__ import annotations

import sys
from sqlalchemy import inspect, text
from backend.database import DATABASE_URL, engine, test_connection, create_tables
from backend import models  # noqa: F401


def run_test() -> int:
    """
    Executes connection test, creates tables, and verifies table schema.
    Returns 0 on success, 1 on failure.
    """
    # Mask password for display
    display_url = DATABASE_URL
    if "@" in display_url and ":" in display_url.split("@")[0]:
        prefix, rest = display_url.split("://", 1)
        userpass, hostdb = rest.split("@", 1)
        username = userpass.split(":")[0]
        display_url = f"{prefix}://{username}:****@{hostdb}"

    print("=" * 65)
    print("CodeAuthentic - Phase 1: Database & Schema Test")
    print("=" * 65)
    print(f"Target Database URL: {display_url}")
    print("-" * 65)

    # 1. Connection Test
    print("[1/3] Testing database connection...")
    if not test_connection():
        print("  FAILED: Could not connect to PostgreSQL database.")
        print("\nTroubleshooting tips:")
        print("  1. Verify PostgreSQL is running on your machine.")
        print("  2. Verify the database exists (e.g. `createdb codeauthentic` or via psql).")
        print("  3. Check username, password, and port in your .env file:")
        print("     DATABASE_URL=postgresql://<user>:<password>@localhost:5432/<dbname>")
        return 1

    print("  SUCCESS: Connected to database.")

    # 2. Table Creation
    print("\n[2/3] Creating tables (Instructor, Lobby, Submission)...")
    try:
        create_tables()
        print("  SUCCESS: Table creation executed without errors.")
    except Exception as exc:
        print(f"  FAILED: Error creating tables: {exc}")
        return 1

    # 3. Schema Inspection
    print("\n[3/3] Inspecting created tables...")
    try:
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        expected_tables = ["instructors", "lobbies", "submissions"]

        all_present = True
        for tbl in expected_tables:
            if tbl in existing_tables:
                columns = [c["name"] for c in inspector.get_columns(tbl)]
                print(f"  [OK] Table '{tbl}' found with {len(columns)} columns: {', '.join(columns)}")
            else:
                print(f"  [MISSING] Table '{tbl}' was NOT found.")
                all_present = False

        if not all_present:
            print("  FAILED: Not all expected tables exist.")
            return 1

        print("  SUCCESS: All schema requirements verified.")

    except Exception as exc:
        print(f"  FAILED: Error during schema inspection: {exc}")
        return 1

    print("-" * 65)
    print("Phase 1 Foundation Test PASSED! Ready for Phase 2 (ML Pipeline).")
    print("=" * 65)
    return 0


if __name__ == "__main__":
    sys.exit(run_test())
