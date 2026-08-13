from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
from app.models.models import MessageStatus, ReceiptStatus, MessageType


class MessageReceiptResponse(BaseModel):
    user_id: int
    username: str
    status: ReceiptStatus
    timestamp: datetime

    class Config:
        from_attributes = True


class AttachmentResponse(BaseModel):
    id: int
    file_name: str
    file_path: str
    mime_type: str
    file_size: int
    created_at: datetime

    class Config:
        from_attributes = True


class ReactionResponse(BaseModel):
    id: int
    emoji: str
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ReactionCreate(BaseModel):
    emoji: str


# Lightweight preview for the quoted/reply message
class ReplyPreview(BaseModel):
    id: int
    content: str
    sender_display_name: Optional[str] = None
    message_type: MessageType = MessageType.TEXT

    class Config:
        from_attributes = True


class MessageBase(BaseModel):
    content: str = ""


class MessageCreate(MessageBase):
    reply_to_id: Optional[int] = None
    message_type: MessageType = MessageType.TEXT


class MessageResponse(MessageBase):
    id: int
    conversation_id: int
    sender_id: int
    sender_username: Optional[str] = None
    sender_display_name: Optional[str] = None
    sender_avatar_url: Optional[str] = None
    message_type: MessageType = MessageType.TEXT
    reply_to_id: Optional[int] = None
    reply_to: Optional[ReplyPreview] = None
    status: MessageStatus
    created_at: datetime
    updated_at: datetime
    expires_at: Optional[datetime] = None
    receipts: List[MessageReceiptResponse] = []
    attachments: List[AttachmentResponse] = []
    reactions: List[ReactionResponse] = []

    class Config:
        from_attributes = True


class MessageStatusUpdate(BaseModel):
    status: MessageStatus


class TypingIndicator(BaseModel):
    """WebSocket event for typing indicator"""
    conversation_id: int
    user_id: int
    is_typing: bool


class MessageEvent(BaseModel):
    """WebSocket event for new message"""
    type: str = "new_message"
    data: dict


class ReadReceiptUpdate(BaseModel):
    """Mark multiple messages as read"""
    message_ids: List[int]
