import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from app.database.database import init_db
from app.database.seed import seed_test_users

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    await seed_test_users()
    print("Database initialized and seeded")
    # Ensure uploads directory exists
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    yield
    # Shutdown
    print("App shutting down")


app = FastAPI(
    title="Signal Clone API",
    description="Real-time messaging API",
    version="1.0.0",
    lifespan=lifespan
)

import os

# CORS middleware
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
]

if os.getenv("FRONTEND_URL"):
    origins.append(os.getenv("FRONTEND_URL"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


# Import and include routers
from app.routers import auth, conversation, messages, users, websocket, attachments, reactions
app.include_router(auth.router)
app.include_router(conversation.router)
app.include_router(messages.router)
app.include_router(users.router)
app.include_router(websocket.router)
app.include_router(attachments.router)
app.include_router(reactions.router)

# Serve uploaded files statically
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")
