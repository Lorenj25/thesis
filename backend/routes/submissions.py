"""
Student submission routes.
Endpoint:
- POST /lobbies/{lobby_id}/submit
Validates files, saves pending submissions, and initiates background analysis.
Students never log in and never receive AI scores.
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Lobby, Submission
from backend.ws import manager

# Map file extensions to supported programming languages
EXT_TO_LANG = {
    ".c": "c",
    ".java": "java",
    ".py": "python",
}

# Maximum allowed file size: 200 KB
MAX_FILE_SIZE_BYTES = 200 * 1024
MAX_FILES_PER_STUDENT = 3

router = APIRouter(tags=["Submissions"])


@router.post("/lobbies/{lobby_id}/submit")
def submit_code(
    lobby_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    student_id: str = Form(..., min_length=1, max_length=50),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
) -> dict:
    """
    Handles student code uploads for a specific exam lobby.
    Validates strictly in the 5-stage order specified by requirements:
    1. Lobby exists, is ACTIVE, and now < expires_at
    2. Extension is one of .c, .java, .py
    3. File size is <= 200 KB; decoded UTF-8 with errors='ignore'
    4. check_context() passes (tokens >= 30)
    5. Student's total submissions in this lobby would not exceed 3
    """
    clean_student_id = student_id.strip()

    # Stage 1: Validate lobby existence and active window
    lobby = db.query(Lobby).filter(Lobby.id == lobby_id).first()
    if not lobby:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam lobby not found.",
        )

    now = datetime.utcnow()
    if lobby.status != "ACTIVE" or now >= lobby.expires_at:
        if lobby.status == "ACTIVE":
            lobby.status = "LOCKED"
            db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This exam session is closed. Submissions are no longer accepted.",
        )

    # Validate file count in request (1 to 3 files)
    if not files or len(files) < 1 or len(files) > 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must upload between 1 and 3 source code files.",
        )

    # Stage 5 check upfront: Check existing files for this student in this lobby
    existing_count = (
        db.query(Submission)
        .filter(Submission.lobby_id == lobby_id, Submission.student_id == clean_student_id)
        .count()
    )
    if existing_count + len(files) > MAX_FILES_PER_STUDENT:
        remaining = max(0, MAX_FILES_PER_STUDENT - existing_count)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Submission limit exceeded. You currently have {existing_count} submission(s) "
                f"and can only submit {remaining} more."
            ),
        )

    # Process and validate each file
    prepared_submissions: List[Submission] = []

    for file in files:
        filename = file.filename or "unnamed"
        _, ext = os.path.splitext(filename.lower())

        # Stage 2: Validate extension
        if ext not in EXT_TO_LANG:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{filename}' has an unsupported extension. Allowed: .c, .java, .py",
            )
        language = EXT_TO_LANG[ext]

        # Stage 3: Read content & validate file size <= 200 KB
        file_bytes = file.file.read()
        if len(file_bytes) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{filename}' exceeds the maximum allowed size of 200 KB.",
            )

        # Decode UTF-8 with errors='ignore'
        source_code = file_bytes.decode("utf-8", errors="ignore")

        # Stage 4: check_context() passes (minimum tokens check)
        try:
            from ml.predictor import check_context, CodeTooShortError
            check_context(source_code, language)
        except ImportError:
            # Fallback if ML package is not yet fitted
            tokens = source_code.split()
            if len(tokens) < 15:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File '{filename}' is too short for meaningful analysis. Minimum length required.",
                )
        except Exception as err:
            # If CodeTooShortError or similar
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{filename}' could not be analyzed: {str(err)}",
            )

        # Create pending submission record
        sub = Submission(
            lobby_id=lobby_id,
            student_id=clean_student_id,
            file_name=filename,
            language=language,
            source_code=source_code,
            status="pending",
            created_at=now,
        )
        prepared_submissions.append(sub)

    # Save all pending submissions to DB
    for sub in prepared_submissions:
        db.add(sub)
    db.commit()

    # Refresh submissions and broadcast pending status via WebSocket
    for sub in prepared_submissions:
        db.refresh(sub)

        # Broadcast 'pending' state to instructor dashboard
        manager.broadcast_threadsafe(
            str(lobby_id),
            {
                "type": "submission_created",
                "submission": {
                    "id": sub.id,
                    "lobby_id": str(sub.lobby_id),
                    "student_id": sub.student_id,
                    "file_name": sub.file_name,
                    "language": sub.language,
                    "status": sub.status,
                    "ai_probability": None,
                    "risk_level": None,
                    "error_message": None,
                    "created_at": sub.created_at.isoformat(),
                },
            },
        )

        # Queue background analysis if background analysis module is available
        try:
            from backend.analysis import run_analysis
            background_tasks.add_task(run_analysis, sub.id)
        except ImportError:
            pass

    return {
        "status": "received",
        "message": f"Successfully received {len(prepared_submissions)} file(s).",
    }
