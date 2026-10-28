"""
WebSocket connection manager for real-time lobby dashboard updates.
Thread-safe broadcasting to allow worker threads to push updates to active sockets.
"""

from __future__ import annotations

import asyncio
import json
import uuid
from typing import Dict, List, Optional
from fastapi import WebSocket

# Global event loop reference captured during FastAPI startup
_main_loop: Optional[asyncio.AbstractEventLoop] = None


def set_event_loop(loop: asyncio.AbstractEventLoop) -> None:
    """Stores the main asyncio event loop for thread-safe cross-thread calls."""
    global _main_loop
    _main_loop = loop


def get_event_loop() -> Optional[asyncio.AbstractEventLoop]:
    """Retrieves the stored event loop."""
    return _main_loop


class LobbyConnectionManager:
    """
    Manages active WebSocket connections partitioned by lobby ID.
    Supports asynchronous and thread-safe synchronous broadcasting.
    """

    def __init__(self) -> None:
        # Maps lobby_id (as str) to list of active WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, lobby_id: str, websocket: WebSocket) -> None:
        """Accepts and registers a new WebSocket connection for a given lobby."""
        await websocket.accept()
        if lobby_id not in self.active_connections:
            self.active_connections[lobby_id] = []
        self.active_connections[lobby_id].append(websocket)
        print(f"[WS] Client connected to lobby {lobby_id}. Total: {len(self.active_connections[lobby_id])}")

    def disconnect(self, lobby_id: str, websocket: WebSocket) -> None:
        """Removes a disconnected WebSocket from the registry."""
        if lobby_id in self.active_connections:
            if websocket in self.active_connections[lobby_id]:
                self.active_connections[lobby_id].remove(websocket)
            if not self.active_connections[lobby_id]:
                del self.active_connections[lobby_id]
        print(f"[WS] Client disconnected from lobby {lobby_id}.")

    async def broadcast(self, lobby_id: str, message: dict) -> None:
        """
        Asynchronously broadcasts a JSON message to all active sockets for a lobby.
        Automatically removes dead/closed connections.
        """
        connections = self.active_connections.get(str(lobby_id), [])
        if not connections:
            return

        payload = json.dumps(message, default=str)
        dead_connections: List[WebSocket] = []

        for connection in connections:
            try:
                await connection.send_text(payload)
            except Exception:
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(str(lobby_id), dead)

    def broadcast_threadsafe(self, lobby_id: str, message: dict) -> None:
        """
        Synchronously schedules a broadcast from a background worker thread
        onto the main event loop.
        """
        loop = get_event_loop()
        if loop is not None and loop.is_running():
            asyncio.run_coroutine_threadsafe(self.broadcast(str(lobby_id), message), loop)
        else:
            print(f"[WS WARNING] Main event loop not running. Could not broadcast to {lobby_id}")


# Singleton connection manager instance
manager = LobbyConnectionManager()
