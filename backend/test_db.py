"""
Database connection and schema verification test script for CodeAuthentic.
Run with: python -m backend.test_db
"""

from __future__ import annotations

import sys
from sqlalchemy import inspect
from backend.database import Base, DATABASE_URL, engine, test_connection, create_tables
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
    print("\n[2/3] Migrating legacy tables and creating current tables...")
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
        expected_tables = Base.metadata.tables.keys()

        all_present = True
        for tbl in expected_tables:
            if tbl in existing_tables:
                actual_columns = {
                    column["name"]: column["type"]
                    for column in inspector.get_columns(tbl)
                }
                expected_columns = Base.metadata.tables[tbl].columns
                columns = list(actual_columns)
                print(f"  [OK] Table '{tbl}' found with {len(columns)} columns: {', '.join(columns)}")
                missing_columns = set(expected_columns.keys()) - actual_columns.keys()
                if missing_columns:
                    print(
                        f"  [MISMATCH] Table '{tbl}' is missing ORM columns: "
                        f"{', '.join(sorted(missing_columns))}"
                    )
                    all_present = False

                for column_name in set(expected_columns.keys()) & actual_columns.keys():
                    expected_type = expected_columns[column_name].type
                    actual_type = actual_columns[column_name]
                    try:
                        expected_python_type = expected_type.python_type
                        actual_python_type = actual_type.python_type
                    except (AttributeError, NotImplementedError):
                        continue

                    if expected_python_type != actual_python_type:
                        print(
                            f"  [MISMATCH] Column '{tbl}.{column_name}' has type "
                            f"{actual_type}; ORM expects {expected_type}."
                        )
                        all_present = False
            else:
                print(f"  [MISSING] Table '{tbl}' was NOT found.")
                all_present = False

        if not all_present:
            print(
                "  FAILED: Database schema does not match the current ORM models. "
                "Review migration errors and retained legacy tables before using the API."
            )
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
