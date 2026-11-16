"""
CreatorIQ Real-Time Analytics WebSocket Engine (Module 7)
Provides real-time metric streams, live engagement feeds, milestone alerts,
and background sync status updates over WebSockets.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set

import jwt
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from ..database import SessionLocal, get_db
from ..deps import get_current_user
from ..models import AgencyCreator, User
from ..security import decode_token

logger = logging.getLogger("creatoriq.websocket")

router = APIRouter(prefix="/api/ws", tags=["Real-Time Analytics"])


class ConnectionManager:
    """
    Manages active WebSocket connections per user, supporting multi-tab connections,
    role-aware event routing, and connection heartbeats.
    """

    def __init__(self):
        # Maps user_id -> list of active WebSocket connections
        self._user_sockets: Dict[int, List[WebSocket]] = {}
        # Maps user_id -> role
        self._user_roles: Dict[int, str] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, user_id: int, role: str, already_accepted: bool = False):
        if not already_accepted:
            await websocket.accept()
        async with self._lock:
            if user_id not in self._user_sockets:
                self._user_sockets[user_id] = []
            self._user_sockets[user_id].append(websocket)
            self._user_roles[user_id] = role
        logger.info("WebSocket connected for user_id=%s, role=%s (active count=%s)",
                    user_id, role, len(self._user_sockets[user_id]))

    async def disconnect(self, websocket: WebSocket, user_id: int):
        async with self._lock:
            if user_id in self._user_sockets:
                if websocket in self._user_sockets[user_id]:
                    self._user_sockets[user_id].remove(websocket)
                if not self._user_sockets[user_id]:
                    del self._user_sockets[user_id]
                    self._user_roles.pop(user_id, None)
        logger.info("WebSocket disconnected for user_id=%s", user_id)

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.warning("Error sending message to socket: %s", e)

    async def send_to_user(self, user_id: int, message: dict) -> int:
        """Sends a JSON message to all active sockets belonging to a specific user."""
        sockets = []
        async with self._lock:
            if user_id in self._user_sockets:
                sockets = list(self._user_sockets[user_id])

        delivered = 0
        for ws in sockets:
            try:
                await ws.send_text(json.dumps(message))
                delivered += 1
            except Exception as e:
                logger.warning("Failed to deliver to user_id=%s: %s", user_id, e)
        return delivered

    async def broadcast_to_role(self, role: str, message: dict) -> int:
        """Broadcasts a JSON message to all active sockets of a given role (e.g. admin, agency)."""
        target_users = []
        async with self._lock:
            for uid, r in self._user_roles.items():
                if r == role or (role == "admin" and r in ("admin", "administrator")):
                    target_users.append(uid)

        total = 0
        for uid in target_users:
            total += await self.send_to_user(uid, message)
        return total

    async def broadcast_metric_update(
        self,
        event_type: str,
        user_id: int,
        data: dict,
        platform: Optional[str] = None
    ) -> int:
        """
        Broadcasts a real-time event:
        1. Always delivers to the resource creator/owner (user_id).
        2. Delivers to any managing agencies that represent this creator.
        3. Delivers to administrators for platform observability.
        """
        payload = {
            "event": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user_id": user_id,
            "platform": platform,
            "data": data,
        }

        delivered = await self.send_to_user(user_id, payload)

        # Look up managing agencies for this creator
        agency_user_ids = []
        try:
            with SessionLocal() as db:
                links = db.query(AgencyCreator).filter_by(creator_id=user_id).all()
                agency_user_ids = [l.agency_id for l in links]
        except Exception as e:
            logger.error("Error querying managing agencies for user_id=%s: %s", user_id, e)

        for agency_id in agency_user_ids:
            delivered += await self.send_to_user(agency_id, payload)

        # Admin broadcast for critical alerts or milestone events
        if event_type in ("milestone_alert", "system_alert"):
            delivered += await self.broadcast_to_role("admin", payload)

        return delivered


# Global Singleton WebSocket Manager
ws_manager = ConnectionManager()


def _authenticate_token(token: str) -> Optional[User]:
    """Helper to authenticate a JWT token string against database."""
    try:
        payload = decode_token(token)
        user_id = int(payload.get("sub", 0))
    except (jwt.PyJWTError, KeyError, ValueError):
        return None

    try:
        with SessionLocal() as db:
            user = db.get(User, user_id)
            if user and user.is_active:
                db.expunge(user)
                return user
    except Exception as e:
        logger.warning("Token auth DB lookup error: %s", e)
    return None


@router.websocket("/analytics")
async def websocket_analytics_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
):
    """
    Real-Time Analytics WebSocket Endpoint.
    Connect via ws://host/api/ws/analytics?token=<jwt_access_token>
    or send initial frame: {"type": "auth", "token": "<jwt_access_token>"}
    """
    user: Optional[User] = None
    accepted_early = False

    if token:
        user = _authenticate_token(token)

    if not user:
        # Await auth message from client within 10 seconds
        await websocket.accept()
        accepted_early = True
        try:
            raw_msg = await asyncio.wait_for(websocket.receive_text(), timeout=10.0)
            data = json.loads(raw_msg)
            if data.get("type") == "auth" and "token" in data:
                user = _authenticate_token(data["token"])
        except (asyncio.TimeoutError, json.JSONDecodeError, WebSocketDisconnect):
            pass

        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication failed")
            return
        await ws_manager.connect(websocket, user.id, user.role, already_accepted=True)
    else:
        await ws_manager.connect(websocket, user.id, user.role, already_accepted=accepted_early)

    # Initial Welcome Frame
    welcome_msg = {
        "event": "connected",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user_id": user.id,
        "role": user.role,
        "message": "Connected to CreatorIQ Real-Time Analytics Stream"
    }
    await ws_manager.send_personal_message(welcome_msg, websocket)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await ws_manager.send_personal_message({"error": "Invalid JSON format"}, websocket)
                continue

            msg_type = msg.get("type")
            if msg_type == "ping":
                await ws_manager.send_personal_message({
                    "type": "pong",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }, websocket)
            elif msg_type == "subscribe":
                platform = msg.get("platform", "all")
                await ws_manager.send_personal_message({
                    "event": "subscription_ack",
                    "platform": platform,
                    "status": "subscribed"
                }, websocket)
            elif msg_type == "close":
                break
            else:
                await ws_manager.send_personal_message({
                    "event": "ack",
                    "type": msg_type,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }, websocket)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning("WebSocket exception for user_id=%s: %s", user.id, e)
    finally:
        await ws_manager.disconnect(websocket, user.id)


@router.post("/simulate-event")
async def simulate_realtime_event(
    event_type: str = Query(..., description="Event type: metric_update, milestone_alert, sync_status, campaign_update"),
    platform: Optional[str] = Query(None, description="Optional platform: youtube, instagram, tiktok, etc."),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Development/Simulation endpoint to push a real-time event over WebSocket
    for verification of live charts, toast notifications, and metric updates.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    mock_payload = {
        "event_type": event_type,
        "platform": platform or "youtube",
        "timestamp": now_iso,
        "metrics": {
            "views": 15420,
            "likes": 1280,
            "shares": 312,
            "engagement_rate": 8.74,
            "estimated_reach": 24500,
            "live_status": "synced"
        }
    }

    delivered = await ws_manager.broadcast_metric_update(
        event_type=event_type,
        user_id=current_user.id,
        data=mock_payload,
        platform=platform
    )

    return {
        "success": True,
        "message": f"Simulated {event_type} event broadcasted successfully",
        "delivered_sockets": delivered,
        "payload": mock_payload
    }
