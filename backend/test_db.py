import sys
import typing

# Patch Pydantic ForwardRef for Python 3.13 compatibility
if sys.version_info >= (3, 13):
    original_evaluate = typing.ForwardRef._evaluate
    
    def patched_evaluate(self, globalns, localns, *args, recursive_guard=None, **kwargs):
        if recursive_guard is None:
            recursive_guard = set()
        return original_evaluate(self, globalns, localns, *args, recursive_guard=recursive_guard, **kwargs)
    
    typing.ForwardRef._evaluate = patched_evaluate

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.models import User
from sqlalchemy import select
from pathlib import Path
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def test():
    db_file = Path('C:/Users/Anuradha Kashaudhan/OneDrive/Desktop/Scaler-ai/backend/signal_clone.db')
    engine = create_async_engine(f'sqlite+aiosqlite:///{db_file.as_posix()}')
    session_maker = sessionmaker(engine, class_=AsyncSession)
    
    async with session_maker() as session:
        res = await session.execute(select(User).where(User.username == 'alice_smith'))
        user = res.scalar_one_or_none()
        print('User:', user.username if user else None)
        if user:
            print('Hash:', user.password_hash)
            print('Verify:', pwd_context.verify('password123', user.password_hash))

asyncio.run(test())
