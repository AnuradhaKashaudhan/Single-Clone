from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    print("Database initialized")
    yield
    # Shutdown
    print("App shutting down")


app = FastAPI(
    title="Signal Clone API",
    description="Real-time messaging API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


# Import and include routers
from app.routers import auth, conversation, messages, users, websocket
app.include_router(auth.router)
app.include_router(conversation.router)
app.include_router(messages.router)
app.include_router(users.router)
app.include_router(websocket.router)
