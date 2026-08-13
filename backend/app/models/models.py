from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Boolean, Table, Index
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

    def __repr__(self):
        return f"<User {self.username}>"


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(Enum(ConversationType), default=ConversationType.DIRECT, index=True)
    name = Column(String(255), nullable=True)  # For group conversations
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
    content = Column(Text, nullable=False)
    status = Column(Enum(MessageStatus), default=MessageStatus.SENT, index=True)
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
