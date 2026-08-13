import asyncio
import sys
import typing

if sys.version_info >= (3, 13):
    original_evaluate = typing.ForwardRef._evaluate
    def patched_evaluate(self, globalns, localns, *args, recursive_guard=None, **kwargs):
        if recursive_guard is None:
            recursive_guard = set()
        return original_evaluate(self, globalns, localns, *args, recursive_guard=recursive_guard, **kwargs)
    typing.ForwardRef._evaluate = patched_evaluate

from app.database.database import engine, Base
from app.models.models import ConversationUserSettings, BlockedUser

async def migrate():
    async with engine.begin() as conn:
        print("Creating ConversationUserSettings and BlockedUser tables...")
        await conn.run_sync(ConversationUserSettings.__table__.create, checkfirst=True)
        await conn.run_sync(BlockedUser.__table__.create, checkfirst=True)
        print("Tables created successfully.")

if __name__ == "__main__":
    asyncio.run(migrate())
