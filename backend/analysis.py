"""
Background code analysis worker for CodeAuthentic.
Processes queued submissions, invokes CodeBERT inference with serialized locking,
updates database state, and broadcasts results to instructor WebSocket dashboards.
"""

from __future__ import annotations

import threading
import time
from backend.database import SessionLocal
from backend.models import Submission
from backend.ws import manager

# Module-level thread lock to serialize model inference and prevent GPU/CPU memory spikes
inference_lock = threading.Lock()


def run_analysis(submission_id: int) -> None:
    """
    Background worker function executed via FastAPI BackgroundTasks.
    Opens its own isolated database session and ensures it closes in a finally block.
    """
    start_time = time.perf_counter()
    db = SessionLocal()

    try:
        submission = db.query(Submission).filter(Submission.id == submission_id).first()
        if not submission:
            print(f"[ANALYSIS ERROR] Submission id={submission_id} not found in database.")
            return

        print(f"[ANALYSIS START] Starting analysis for submission {submission_id} ({submission.file_name}, {submission.language})...")

        # Acquire inference lock so only one model forward pass executes at a time
        with inference_lock:
            try:
                # Dynamic import of ml.predictor.analyze
                from ml.predictor import analyze
                result = analyze(submission.source_code, submission.file_name)

                submission.ai_probability = float(result["ai_probability"])
                submission.risk_level = str(result["risk_level"])
                submission.status = "done"
                submission.error_message = None

            except Exception as ml_err:
                print(f"[ANALYSIS EXCEPTION] Error processing submission {submission_id}: {ml_err}")
                submission.status = "failed"
                submission.error_message = str(ml_err)

        db.commit()
        db.refresh(submission)

        duration = time.perf_counter() - start_time
        print(f"[ANALYSIS COMPLETE] Submission {submission_id} ({submission.file_name}) finished in {duration:.4f}s. Status={submission.status}, Prob={submission.ai_probability}")

        # Broadcast live update to instructor dashboard via thread-safe WebSocket broadcast
        manager.broadcast_threadsafe(
            str(submission.lobby_id),
            {
                "type": "submission_updated",
                "submission": {
                    "id": submission.id,
                    "lobby_id": str(submission.lobby_id),
                    "student_id": submission.student_id,
                    "file_name": submission.file_name,
                    "language": submission.language,
                    "status": submission.status,
                    "ai_probability": submission.ai_probability,
                    "risk_level": submission.risk_level,
                    "error_message": submission.error_message,
                    "created_at": submission.created_at.isoformat(),
                },
            },
        )

    except Exception as general_err:
        print(f"[ANALYSIS CRITICAL ERROR] Failed in run_analysis({submission_id}): {general_err}")
        try:
            db.rollback()
        except Exception:
            pass
    finally:
        db.close()
