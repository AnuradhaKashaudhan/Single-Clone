"""
Database seeding script - populates the database with sample data for development/demo
Run after first startup: python seed_db.py
"""

import asyncio
import sys
import typing
from datetime import datetime, timedelta

# Patch Pydantic ForwardRef for Python 3.13 compatibility
if sys.version_info >= (3, 13):
    original_evaluate = typing.ForwardRef._evaluate
    def patched_evaluate(self, globalns, localns, *args, recursive_guard=None, **kwargs):
        if recursive_guard is None:
            recursive_guard = set()
        return original_evaluate(self, globalns, localns, *args, recursive_guard=recursive_guard, **kwargs)
    typing.ForwardRef._evaluate = patched_evaluate

from sqlalchemy.ext.asyncio import AsyncSession
from app.database.database import AsyncSessionLocal, engine, Base
from app.models.models import (
    User, Conversation, Message, MessageReceipt,
    ConversationType, MessageStatus, ReceiptStatus, UserRole,
    conversation_participants
)
from passlib.context import CryptContext
import random

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def create_sample_users(session: AsyncSession):
    """Create 5 sample users"""
    users_data = [
        {
            "username": "alice_smith",
            "phone_number": "+1-555-0101",
            "display_name": "Alice Smith",
            "avatar_url": "https://i.pravatar.cc/150?img=1",
            "status": "online",
            "last_seen": datetime.utcnow(),
        },
        {
            "username": "bob_jones",
            "phone_number": "+1-555-0102",
            "display_name": "Bob Jones",
            "avatar_url": "https://i.pravatar.cc/150?img=2",
            "status": "online",
            "last_seen": datetime.utcnow(),
        },
        {
            "username": "carol_white",
            "phone_number": "+1-555-0103",
            "display_name": "Carol White",
            "avatar_url": "https://i.pravatar.cc/150?img=3",
            "status": "away",
            "last_seen": datetime.utcnow() - timedelta(hours=2),
        },
        {
            "username": "david_brown",
            "phone_number": "+1-555-0104",
            "display_name": "David Brown",
            "avatar_url": "https://i.pravatar.cc/150?img=4",
            "status": "offline",
            "last_seen": datetime.utcnow() - timedelta(days=1),
        },
        {
            "username": "emma_davis",
            "phone_number": "+1-555-0105",
            "display_name": "Emma Davis",
            "avatar_url": "https://i.pravatar.cc/150?img=5",
            "status": "online",
            "last_seen": datetime.utcnow(),
        },
    ]

    users = []
    for data in users_data:
        password_hash = pwd_context.hash("password123")  # Default password for all seed users
        user = User(
            username=data["username"],
            phone_number=data["phone_number"],
            display_name=data["display_name"],
            avatar_url=data["avatar_url"],
            status=data["status"],
            last_seen=data["last_seen"],
            password_hash=password_hash,
        )
        session.add(user)
        users.append(user)

    await session.flush()  # Ensure users get IDs
    return users


async def create_sample_conversations(session: AsyncSession, users: list):
    """Create sample direct and group conversations"""
    conversations = []

    # Direct conversation 1: alice ↔ bob
    direct1 = Conversation(
        type=ConversationType.DIRECT,
        created_at=datetime.utcnow() - timedelta(days=7),
    )
    session.add(direct1)
    conversations.append(("direct", direct1, [users[0], users[1]]))

    # Direct conversation 2: alice ↔ carol
    direct2 = Conversation(
        type=ConversationType.DIRECT,
        created_at=datetime.utcnow() - timedelta(days=5),
    )
    session.add(direct2)
    conversations.append(("direct", direct2, [users[0], users[2]]))

    # Direct conversation 3: bob ↔ emma
    direct3 = Conversation(
        type=ConversationType.DIRECT,
        created_at=datetime.utcnow() - timedelta(days=3),
    )
    session.add(direct3)
    conversations.append(("direct", direct3, [users[1], users[4]]))

    # Group conversation 1: Team Alpha (alice, bob, carol)
    group1 = Conversation(
        type=ConversationType.GROUP,
        name="Team Alpha",
        created_at=datetime.utcnow() - timedelta(days=14),
    )
    session.add(group1)
    conversations.append(("group", group1, [users[0], users[1], users[2]]))

    # Group conversation 2: Friends (all users)
    group2 = Conversation(
        type=ConversationType.GROUP,
        name="Friends",
        created_at=datetime.utcnow() - timedelta(days=30),
    )
    session.add(group2)
    conversations.append(("group", group2, users))

    await session.flush()  # Ensure conversations get IDs
    return conversations


async def create_sample_messages(session: AsyncSession, conversations: list):
    """Create sample messages with read receipts"""
    message_templates = [
        "Hey, how are you doing?",
        "Just finished the project! 🎉",
        "Let's catch up soon",
        "Did you see the latest update?",
        "Thanks for your help yesterday!",
        "Looking forward to the meeting",
        "Can you send me those files?",
        "Great work on that!",
        "See you tomorrow",
        "Perfect, let's go with that plan",
        "LOL, that's hilarious 😂",
        "Definitely! Count me in",
        "Not sure about that one",
        "Let me check and get back to you",
        "Sounds good to me!",
    ]

    now = datetime.utcnow()

    for conv_type, conversation, participants in conversations:
        num_messages = random.randint(5, 15)

        for i in range(num_messages):
            # Random sender from participants
            sender = random.choice(participants)

            # Messages older = earlier timestamps
            message_time = now - timedelta(hours=random.randint(0, 72))

            message = Message(
                conversation_id=conversation.id,
                sender_id=sender.id,
                content=random.choice(message_templates),
                status=random.choice([MessageStatus.SENT, MessageStatus.DELIVERED, MessageStatus.READ]),
                created_at=message_time,
            )
            session.add(message)

            await session.flush()  # Get message ID

            # Add read receipts for other participants (simulating delivery/read)
            for recipient in participants:
                if recipient.id != sender.id:
                    # Chance that message has been read
                    receipt_status = random.choice([
                        ReceiptStatus.DELIVERED,
                        ReceiptStatus.DELIVERED,
                        ReceiptStatus.READ,  # Higher chance of read
                    ])

                    receipt_time = message_time + timedelta(seconds=random.randint(5, 300))

                    receipt = MessageReceipt(
                        message_id=message.id,
                        user_id=recipient.id,
                        status=receipt_status,
                        timestamp=receipt_time,
                    )
                    session.add(receipt)

        await session.flush()


async def seed_database():
    """Main seed function"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        try:
            print("🌱 Seeding database...")

            # Create users
            print("  Creating sample users...")
            users = await create_sample_users(session)
            print(f"  ✓ Created {len(users)} users")

            # Create conversations
            print("  Creating sample conversations...")
            conversations = await create_sample_conversations(session, users)
            print(f"  ✓ Created {len(conversations)} conversations")

            # Create messages
            print("  Creating sample messages...")
            await create_sample_messages(session, conversations)
            print("  ✓ Created sample messages with read receipts")

            # Commit all changes
            await session.commit()
            print("\n✅ Database seeding completed successfully!")
            print("\nSample users (password: 'password123'):")
            for user in users:
                print(f"  • {user.username} ({user.display_name})")

        except Exception as e:
            await session.rollback()
            print(f"\n❌ Error during seeding: {str(e)}")
            raise


if __name__ == "__main__":
    asyncio.run(seed_database())
