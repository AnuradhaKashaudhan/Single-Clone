from app.schemas.auth import (
    Token,
    LoginRequest,
    RegisterRequest,
    OTPVerifyRequest,
    OTPSendRequest,
    TokenData,
)
from app.schemas.user import (
    UserBase,
    UserCreate,
    UserResponse,
    UserInDB,
    UserUpdate,
)
from app.schemas.conversation import (
    ConversationBase,
    ConversationCreate,
    ConversationResponse,
    ConversationListItem,
    ConversationUpdate,
    AddParticipantRequest,
    RemoveParticipantRequest,
    ConversationParticipantResponse,
)
from app.schemas.message import (
    MessageBase,
    MessageCreate,
    MessageResponse,
    MessageStatusUpdate,
    TypingIndicator,
    MessageEvent,
    ReadReceiptUpdate,
    MessageReceiptResponse,
)
from app.schemas.contact import (
    ContactResponse,
    ContactSearchRequest,
)

__all__ = [
    # Auth
    "Token",
    "LoginRequest",
    "RegisterRequest",
    "OTPVerifyRequest",
    "OTPSendRequest",
    "TokenData",
    # User
    "UserBase",
    "UserCreate",
    "UserResponse",
    "UserInDB",
    "UserUpdate",
    # Conversation
    "ConversationBase",
    "ConversationCreate",
    "ConversationResponse",
    "ConversationListItem",
    "ConversationUpdate",
    "AddParticipantRequest",
    "RemoveParticipantRequest",
    "ConversationParticipantResponse",
    # Message
    "MessageBase",
    "MessageCreate",
    "MessageResponse",
    "MessageStatusUpdate",
    "TypingIndicator",
    "MessageEvent",
    "ReadReceiptUpdate",
    "MessageReceiptResponse",
    # Contact
    "ContactResponse",
    "ContactSearchRequest",
]
