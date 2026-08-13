from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Boolean, Table, Index, BigInteger, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database.database import Base
import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MEMBER = "member"


class MessageStatus(str, enum.Enum):
    SENDING = "sending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"


class ReceiptStatus(str, enum.Enum):
    DELIVERED = "delivered"
    READ = "read"


class ConversationType(str, enum.Enum):
    DIRECT = "direct"
    GROUP = "group"


class MessageType(str, enum.Enum):
    TEXT = "text"
    IMAGE = "image"
    FILE = "file"


# Association table for conversation participants
conversation_participants = Table(
    "conversation_participants",
    Base.metadata,
    Column("conversation_id", Integer, ForeignKey("conversations.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role", Enum(UserRole), default=UserRole.MEMBER),
    Column("joined_at", DateTime, default=datetime.utcnow),
)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), unique=True, index=True, nullable=False)
    phone_number = Column(String(20), unique=True, index=True, nullable=True)
    display_name = Column(String(255), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    status = Column(String(50), default="offline")  # online, offline, away
    last_seen = Column(DateTime, default=datetime.utcnow)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    conversations = relationship("Conversation", secondary=conversation_participants, back_populates="participants")
    sent_messages = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender")
    message_receipts = relationship("MessageReceipt", back_populates="user")
    reactions = relationship("MessageReaction", back_populates="user")

    def __repr__(self):
        return f"<User {self.username}>"


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(Enum(ConversationType), default=ConversationType.DIRECT, index=True)
    name = Column(String(255), nullable=True)  # For group conversations
    disappearing_messages_seconds = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    participants = relationship("User", secondary=conversation_participants, back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Conversation {self.id}>"


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), index=True, nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    content = Column(Text, nullable=False, default="")
    message_type = Column(Enum(MessageType), default=MessageType.TEXT, nullable=False)
    reply_to_id = Column(Integer, ForeignKey("messages.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(Enum(MessageStatus), default=MessageStatus.SENT, index=True)
    expires_at = Column(DateTime, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Indexes for fast queries
    __table_args__ = (
        Index("ix_message_conversation_created", "conversation_id", "created_at"),
    )

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    receipts = relationship("MessageReceipt", back_populates="message", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="message", cascade="all, delete-orphan")
    reactions = relationship("MessageReaction", back_populates="message", cascade="all, delete-orphan")
    reply_to = relationship("Message", remote_side="Message.id", foreign_keys=[reply_to_id])

    def __repr__(self):
        return f"<Message {self.id}>"


class MessageReceipt(Base):
    __tablename__ = "message_receipts"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    status = Column(Enum(ReceiptStatus), default=ReceiptStatus.DELIVERED, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    # Indexes
    __table_args__ = (
        Index("ix_receipt_message_user", "message_id", "user_id"),
    )

    # Relationships
    message = relationship("Message", back_populates="receipts")
    user = relationship("User", back_populates="message_receipts")

    def __repr__(self):
        return f"<MessageReceipt {self.id}>"


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id", ondelete="CASCADE"), index=True, nullable=False)
    file_name = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)  # relative path under /uploads/
    mime_type = Column(String(200), nullable=False)
    file_size = Column(BigInteger, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    message = relationship("Message", back_populates="attachments")

    def __repr__(self):
        return f"<Attachment {self.file_name}>"


class MessageReaction(Base):
    __tablename__ = "message_reactions"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    emoji = Column(String(10), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("message_id", "user_id", "emoji", name="uq_reaction_msg_user_emoji"),
        Index("ix_reaction_message_id", "message_id"),
    )

    # Relationships
    message = relationship("Message", back_populates="reactions")
    user = relationship("User", back_populates="reactions")

    def __repr__(self):
        return f"<MessageReaction {self.emoji} by user {self.user_id}>"


class ConversationUserSettings(Base):
    __tablename__ = "conversation_user_settings"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), primary_key=True)
    is_pinned = Column(Boolean, default=False, nullable=False)
    is_archived = Column(Boolean, default=False, nullable=False)
    muted_until = Column(DateTime, nullable=True)
    cleared_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_conv_user_settings", "user_id", "conversation_id"),
    )

    def __repr__(self):
        return f"<ConversationUserSettings user={self.user_id} conv={self.conversation_id}>"


class BlockedUser(Base):
    __tablename__ = "blocked_users"

    blocker_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    blocked_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_blocked_users", "blocker_id", "blocked_id"),
    )

    def __repr__(self):
        return f"<BlockedUser blocker={self.blocker_id} blocked={self.blocked_id}>"
