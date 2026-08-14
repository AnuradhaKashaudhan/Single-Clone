import bcrypt
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import User
from app.database.database import AsyncSessionLocal


async def seed_test_users():
    """
    Seed the database with permanent test users for evaluation.
    This ensures that even if Render restarts and clears the SQLite DB,
    the teacher will always have access to these accounts.
    """
    test_users = [
        {
            "username": "teacher",
            "display_name": "Teacher Evaluator",
            "phone_number": "+10000000001",
            "password": "password123",
            "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Teacher",
        },
        {
            "username": "alice_smith",
            "display_name": "Alice Smith",
            "phone_number": "+10000000002",
            "password": "password123",
            "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
        },
        {
            "username": "bob_jones",
            "display_name": "Bob Jones",
            "phone_number": "+10000000003",
            "password": "password123",
            "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
        }
    ]

    async with AsyncSessionLocal() as session:
        for user_data in test_users:
            # Check if user already exists
            result = await session.execute(
                select(User).where(User.username == user_data["username"])
            )
            existing_user = result.scalar_one_or_none()

            if not existing_user:
                hashed_pw = bcrypt.hashpw(
                    user_data["password"].encode('utf-8'), 
                    bcrypt.gensalt()
                ).decode('utf-8')

                new_user = User(
                    username=user_data["username"],
                    phone_number=user_data["phone_number"],
                    display_name=user_data["display_name"],
                    avatar_url=user_data["avatar_url"],
                    password_hash=hashed_pw,
                    status="offline",
                    last_seen=datetime.utcnow(),
                )
                session.add(new_user)
        
        await session.commit()
        print("Test users seeded successfully.")
