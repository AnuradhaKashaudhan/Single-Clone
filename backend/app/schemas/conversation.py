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
        from_attributes = True


class ConversationUserSettingsResponse(BaseModel):
    is_pinned: bool = False
    is_archived: bool = False
    muted_until: Optional[datetime] = None
    cleared_at: Optional[datetime] = None

    class Config:
        from_attributes = True


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
    disappearing_messages_seconds: Optional[int] = None
    settings: Optional[ConversationUserSettingsResponse] = None

    class Config:
        from_attributes = True


class ConversationListItem(BaseModel):
    id: int
    type: ConversationType
    name: Optional[str]
    last_message_preview: Optional[str]
    last_message_timestamp: Optional[datetime]
    unread_count: int
    disappearing_messages_seconds: Optional[int]
    settings: Optional[ConversationUserSettingsResponse] = None
    participants: List[ConversationParticipantResponse]

    class Config:
        from_attributes = True


class AddParticipantRequest(BaseModel):
    user_id: int
    role: UserRole = UserRole.MEMBER


class RemoveParticipantRequest(BaseModel):
    user_id: int


class UpdateDisappearingTimerRequest(BaseModel):
    disappearing_messages_seconds: Optional[int] = None

class ConversationSettingsUpdate(BaseModel):
    is_pinned: Optional[bool] = None
    is_archived: Optional[bool] = None
    muted_until: Optional[datetime] = None
    # For clearing history, we won't use this model. We'll use a separate endpoint or just pass it here.
    # Let's handle cleared_at separately via a clear-history endpoint.
