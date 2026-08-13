from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
from app.models.models import ConversationType, UserRole


class ConversationParticipantResponse(BaseModel):
    id: int
    username: str
    display_name: str
    avatar_url: Optional[str]
    status: str
    role: Optional[UserRole] = UserRole.MEMBER

    class Config:
        orm_mode = True


class ConversationBase(BaseModel):
    type: ConversationType
    name: Optional[str] = None


class ConversationCreate(ConversationBase):
    participant_ids: List[int]  # List of user IDs to add to conversation


class ConversationUpdate(BaseModel):
    name: Optional[str] = None


class ConversationResponse(ConversationBase):
    id: int
    created_at: datetime
    updated_at: datetime
    participants: List[ConversationParticipantResponse]
    last_message_preview: Optional[str] = None
    last_message_timestamp: Optional[datetime] = None
    unread_count: int = 0

    class Config:
        orm_mode = True


class ConversationListItem(BaseModel):
    id: int
    type: ConversationType
    name: Optional[str]
    last_message_preview: Optional[str]
    last_message_timestamp: Optional[datetime]
    unread_count: int
    participants: List[ConversationParticipantResponse]

    class Config:
        orm_mode = True


class AddParticipantRequest(BaseModel):
    user_id: int
    role: UserRole = UserRole.MEMBER


class RemoveParticipantRequest(BaseModel):
    user_id: int
