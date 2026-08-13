"""
Standalone DB migration — safe, does NOT drop existing data.
Uses SQLite directly so it avoids the FastAPI/pydantic import chain.
Run: venv\Scripts\python.exe migrate_db.py
"""
import asyncio
import os
from pathlib import Path

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey,
    Enum, Table, Index, BigInteger, UniqueConstraint,
)
from sqlalchemy.pool import StaticPool
from datetime import datetime
import enum


BACKEND_DIR = Path(__file__).parent
DATABASE_FILE = BACKEND_DIR / "signal_clone.db"
DATABASE_URL = f"sqlite+aiosqlite:///{DATABASE_FILE.as_posix()}"

engine = create_async_engine(DATABASE_URL, poolclass=StaticPool, echo=True, future=True)
Base = declarative_base()

# ── Enums ────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MEMBER = "member"

class MessageStatus(str, enum.Enum):
    SENDING = "sending"; SENT = "sent"; DELIVERED = "delivered"; READ = "read"

class ReceiptStatus(str, enum.Enum):
    DELIVERED = "delivered"; READ = "read"

class ConversationType(str, enum.Enum):
    DIRECT = "direct"; GROUP = "group"

class MessageType(str, enum.Enum):
    TEXT = "text"; IMAGE = "image"; FILE = "file"

# ── Tables ───────────────────────────────────────────────────────────────────

conversation_participants = Table(
    "conversation_participants", Base.metadata,
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
    status = Column(String(50), default="offline")
    last_seen = Column(DateTime, default=datetime.utcnow)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(Integer, primary_key=True, index=True)
    type = Column(Enum(ConversationType), default=ConversationType.DIRECT, index=True)
    name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow)

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), index=True, nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    content = Column(Text, nullable=False, default="")
    message_type = Column(Enum(MessageType), default=MessageType.TEXT, nullable=False)
    reply_to_id = Column(Integer, ForeignKey("messages.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(Enum(MessageStatus), default=MessageStatus.SENT, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow)
    __table_args__ = (Index("ix_message_conversation_created", "conversation_id", "created_at"),)

class MessageReceipt(Base):
    __tablename__ = "message_receipts"
    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    status = Column(Enum(ReceiptStatus), default=ReceiptStatus.DELIVERED, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    __table_args__ = (Index("ix_receipt_message_user", "message_id", "user_id"),)

class Attachment(Base):
    __tablename__ = "attachments"
    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id", ondelete="CASCADE"), index=True, nullable=False)
    file_name = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    mime_type = Column(String(200), nullable=False)
    file_size = Column(BigInteger, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

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


async def migrate():
    print(f"Migrating: {DATABASE_FILE}")
    async with engine.begin() as conn:
        # create_all is safe — only creates tables/columns that don't exist yet
        await conn.run_sync(Base.metadata.create_all)
    print("Migration complete!")


asyncio.run(migrate())
