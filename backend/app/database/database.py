import os
from pathlib import Path

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import StaticPool


# ---------------------------------------------------------
# Database configuration
# ---------------------------------------------------------

# Project backend directory:
# backend/
# ├── signal_clone.db
# └── app/
#     └── database/
#         └── database.py
#
# This makes sure we always use the same SQLite database,
# regardless of where you start uvicorn from.

BACKEND_DIR = Path(__file__).resolve().parents[2]
DATABASE_FILE = BACKEND_DIR / "signal_clone.db"

# Allow DATABASE_URL to override the default if needed.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite+aiosqlite:///{DATABASE_FILE.as_posix()}",
)


# ---------------------------------------------------------
# Debug information
# ---------------------------------------------------------

print("=" * 60)
print("DATABASE CONFIGURATION")
print("=" * 60)
print(f"Backend directory : {BACKEND_DIR}")
print(f"Database file     : {DATABASE_FILE}")
print(f"Database exists   : {DATABASE_FILE.exists()}")
print(f"Database URL      : {DATABASE_URL}")
print("=" * 60)


# ---------------------------------------------------------
# Create async database engine
# ---------------------------------------------------------

engine_kwargs = {
    "echo": False,
    "future": True,
    "pool_pre_ping": True,
}

# SQLite works well with StaticPool for this local development setup.
if "sqlite" in DATABASE_URL:
    engine_kwargs["poolclass"] = StaticPool

engine = create_async_engine(
    DATABASE_URL,
    **engine_kwargs,
)


# ---------------------------------------------------------
# Session factory
# ---------------------------------------------------------

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    future=True,
)


# ---------------------------------------------------------
# SQLAlchemy Base
# ---------------------------------------------------------

Base = declarative_base()


# ---------------------------------------------------------
# FastAPI database dependency
# ---------------------------------------------------------

async def get_db():
    """
    Provide a database session to FastAPI endpoints.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


# ---------------------------------------------------------
# Initialize database tables
# ---------------------------------------------------------

async def init_db():
    """
    Create database tables if they don't already exist.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)