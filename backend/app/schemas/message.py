from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
from app.models.models import MessageStatus, ReceiptStatus


class MessageReceiptResponse(BaseModel):
    user_id: int
    username: str
    status: ReceiptStatus
    timestamp: datetime

    class Config:
        orm_mode = True


class MessageBase(BaseModel):
    content: str


class MessageCreate(MessageBase):
    pass


class MessageResponse(MessageBase):
    id: int
    conversation_id: int
    sender_id: int
    sender_username: Optional[str] = None
    sender_display_name: Optional[str] = None
    sender_avatar_url: Optional[str] = None
    status: MessageStatus
    created_at: datetime
    updated_at: datetime
    receipts: List[MessageReceiptResponse] = []

    class Config:
        orm_mode = True


class MessageStatusUpdate(BaseModel):
    status: MessageStatus


class TypingIndicator(BaseModel):
    """WebSocket event for typing indicator"""
    conversation_id: int
    user_id: int
    is_typing: bool


class MessageEvent(BaseModel):
    """WebSocket event for new message"""
    type: str = "new_message"  # new_message, message_status_change, typing, user_online, user_offline
    data: dict  # Content varies by event type


class ReadReceiptUpdate(BaseModel):
    """Mark multiple messages as read"""
    message_ids: List[int]
