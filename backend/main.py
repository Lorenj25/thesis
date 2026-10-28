"""
CodeAuthentic - FastAPI Main Application Entry Point.
AI-Generated Source Code Detector for CCIS, Caraga State University.

Runs with:
uvicorn backend.main:app --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import asyncio
import os
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from backend.database import create_tables, test_connection
from backend.routes import auth, lobbies, submissions
from backend.security import decode_token
from backend.ws import manager, set_event_loop


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Initializes database tables, captures event loop for thread-safe broadcasts,
    and preloads ML models if available.
    """
    print("[STARTUP] Starting CodeAuthentic server...")

    # 1. Capture running event loop for thread-safe WebSocket broadcasts
    loop = asyncio.get_running_loop()
    set_event_loop(loop)
    print("[STARTUP] AsyncIO event loop registered for background broadcasts.")

    # 2. Initialize database tables in development
    try:
        create_tables()
    except Exception as exc:
        print(f"[STARTUP WARNING] Database table creation deferred: {exc}")

    # 3. Preload ML models if ML module exists
    try:
        from ml.predictor import preload_models
        print("[STARTUP] Preloading CodeBERT language models...")
        preload_models()
        print("[STARTUP] CodeBERT models successfully loaded.")
    except (ImportError, Exception) as exc:
        print(f"[STARTUP INFO] ML models not yet loaded ({exc}). Will load when fitted.")

    yield

    print("[SHUTDOWN] Stopping CodeAuthentic server...")


# Initialize FastAPI application
app = FastAPI(
    title="CodeAuthentic API",
    description="AI-generated source code detector (C, Java, Python) for live computer-laboratory exams.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS for frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(auth.router)
app.include_router(lobbies.router)
app.include_router(submissions.router)


# ==============================================================================
# Real-Time WebSocket Endpoint
# ==============================================================================

@app.websocket("/ws/lobbies/{lobby_id}")
async def lobby_websocket_endpoint(
    websocket: WebSocket,
    lobby_id: str,
    token: str = Query(...),
):
    """
    Real-time WebSocket connection for instructor dashboard.
    Only the owning instructor may connect.
    Broadcasts live updates whenever submissions are created, analyzed, or failed.
    """
    # 1. Validate JWT Token
    try:
        token_data = decode_token(token)
    except HTTPException:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # 2. Verify Lobby Ownership in DB
    from backend.database import SessionLocal
    from backend.models import Lobby

    db = SessionLocal()
    try:
        lobby_uuid = uuid.UUID(lobby_id)
        lobby = db.query(Lobby).filter(Lobby.id == lobby_uuid).first()
        if not lobby or lobby.instructor_id != token_data.instructor_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    finally:
        db.close()

    # 3. Connect to manager
    await manager.connect(str(lobby_id), websocket)
    try:
        while True:
            # Keep socket open and listen for optional ping/pong messages
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(str(lobby_id), websocket)
    except Exception:
        manager.disconnect(str(lobby_id), websocket)


# ==============================================================================
# Health Check & Static Files
# ==============================================================================

@app.get("/health")
def health_check():
    """System health check endpoint."""
    db_ok = test_connection()
    return {
        "status": "ok",
        "app": "CodeAuthentic",
        "database_connected": db_ok,
    }


# Frontend directory path
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

if FRONTEND_DIR.exists():
    # Mount static assets if directories exist
    css_dir = FRONTEND_DIR / "css"
    js_dir = FRONTEND_DIR / "js"
    if css_dir.exists():
        app.mount("/css", StaticFiles(directory=str(css_dir)), name="css")
    if js_dir.exists():
        app.mount("/js", StaticFiles(directory=str(js_dir)), name="js")

    @app.get("/", response_class=HTMLResponse)
    def serve_index():
        index_file = FRONTEND_DIR / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
        return HTMLResponse("<h1>CodeAuthentic</h1><p>Visit <a href='/docs'>/docs</a> for the API.</p>")

    @app.get("/dashboard", response_class=HTMLResponse)
    def serve_dashboard():
        dash_file = FRONTEND_DIR / "dashboard.html"
        if dash_file.exists():
            return FileResponse(str(dash_file))
        return HTMLResponse("<h1>Instructor Dashboard</h1>")

    @app.get("/lobby/{lobby_id}", response_class=HTMLResponse)
    def serve_lobby(lobby_id: str):
        lobby_file = FRONTEND_DIR / "lobby.html"
        if lobby_file.exists():
            return FileResponse(str(lobby_file))
        return HTMLResponse(f"<h1>Exam Lobby: {lobby_id}</h1>")
