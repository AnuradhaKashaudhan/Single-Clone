import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, List, Any
import asyncio

from app.database.database import get_db
from app.models.models import User
from app.routers.auth import get_current_user_ws

router = APIRouter(tags=["websocket"])

class ConnectionManager:
    def __init__(self):
        # Map user_id to a list of their active WebSocket connections
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        
        # Broadcast online status
        await self.broadcast_user_status(user_id, "online")

    async def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                # Broadcast offline status
                await self.broadcast_user_status(user_id, "offline")

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"Error sending to user {user_id}: {e}")

    async def broadcast_user_status(self, user_id: int, status: str):
        # Tell everyone that this user is online/offline
        message = {
            "type": "user_status",
            "user_id": user_id,
            "status": status
        }
        # In a real app, you'd only broadcast to people who have a conversation with this user
        for uid, connections in self.active_connections.items():
            if uid != user_id:
                for connection in connections:
                    try:
                        await connection.send_json(message)
                    except Exception:
                        pass

manager = ConnectionManager()

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...)
):
    try:
        user = await get_current_user_ws(token)
        if not user:
            await websocket.close(code=1008)
            return
            
        await manager.connect(websocket, user.id)
        
        try:
            while True:
                data = await websocket.receive_text()
                # Parse incoming message (e.g. typing indicators)
                try:
                    message_data = json.loads(data)
                    event_type = message_data.get("type")
                    
                    if event_type == "typing":
                        conversation_id = message_data.get("conversation_id")
                        participant_ids = message_data.get("participant_ids", [])
                        
                        # Forward typing event to other participants
                        forward_msg = {
                            "type": "typing",
                            "conversation_id": conversation_id,
                            "user_id": user.id,
                            "username": user.username,
                            "display_name": user.display_name
                        }
                        
                        for pid in participant_ids:
                            if pid != user.id:
                                await manager.send_personal_message(forward_msg, pid)
                                
                except json.JSONDecodeError:
                    pass
                    
        except WebSocketDisconnect:
            await manager.disconnect(websocket, user.id)
            
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.close(code=1008)
        except Exception:
            pass
