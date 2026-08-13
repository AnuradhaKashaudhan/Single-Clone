# Signal Messenger Clone - Full Stack Web App

A functional, visually accurate clone of Signal Messenger built as a full-stack web application. This project replicates Signal's UI/UX and core real-time messaging workflows.

## 🏗️ Project Structure

```
signal-clone/
├── frontend/          # Next.js (React + TypeScript) client
│   ├── src/
│   │   ├── app/      # App Router
│   │   ├── components/
│   │   ├── hooks/
│   │   └── lib/
│   ├── public/
│   ├── package.json
│   └── .env.local    # Environment variables
│
└── backend/           # FastAPI (Python) server
    ├── app/
    │   ├── models/   # SQLAlchemy ORM models
    │   ├── schemas/  # Pydantic request/response schemas
    │   ├── routers/  # API route handlers
    │   ├── services/ # Business logic
    │   └── database/ # Database configuration
    ├── main.py       # FastAPI entry point
    ├── requirements.txt
    └── .env          # Environment variables
```

## 🚀 Tech Stack

- **Frontend:** Next.js 15+, TypeScript, Tailwind CSS, React Hooks
- **Backend:** FastAPI, Python 3.9+, SQLAlchemy ORM
- **Database:** SQLite (async via aiosqlite)
- **Real-time:** WebSockets
- **Auth:** JWT (mocked for development)

## 📋 Prerequisites

- Node.js 18+ (for frontend)
- Python 3.9+ (for backend)
- npm or yarn

## ⚙️ Setup Instructions

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/Scripts/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run server
python main.py
```

Server runs at: `http://localhost:8000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

Client runs at: `http://localhost:3000`

## 📊 Database Schema

The app uses a normalized SQLite schema:

- **users**: User profiles with auth data
- **conversations**: Direct and group chats
- **conversation_participants**: Join table for conversation membership
- **messages**: All chat messages with delivery status
- **message_receipts**: Read/delivered status per recipient

See [Backend Database Models](./backend/app/models/models.py) for full schema details.

## 🔌 API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with credentials
- `POST /auth/logout` - Logout
- `GET /auth/me` - Get current user

### Conversations
- `GET /conversations` - List user's conversations
- `GET /conversations/{id}` - Get conversation details
- `POST /conversations` - Create new conversation
- `DELETE /conversations/{id}` - Delete conversation

### Messages
- `GET /conversations/{id}/messages` - Get chat history
- `POST /conversations/{id}/messages` - Send message
- `PUT /messages/{id}` - Update message status

### WebSocket
- `WS /ws/{conversation_id}` - Real-time messaging

## 🎯 Core Features (MVP)

1. **Authentication**: Mocked phone/username registration, OTP verification, JWT sessions
2. **Contacts**: Contact list, search, add new contacts
3. **One-on-One Messaging**: Real-time chat, delivery/read receipts, typing indicators
4. **Group Messaging**: Create groups, manage members, admin controls
5. **UI/UX**: Signal-inspired design (dark theme, rounded bubbles, checkmarks)

## 🎨 Design References

- Signal Desktop/Web interface
- Dark navy/blue accent palette
- Minimalist, privacy-focused aesthetic
- Single/double checkmark read receipts

## 🔐 Security Notes

- ⚠️ **No real encryption** - This is a demo app. Encryption is mocked only.
- ⚠️ Use `--sqlite--` in development only
- ⚠️ Change `SECRET_KEY` before production deployment

## 📦 Seed Data

The database comes seeded with:
- 5 mock users with avatars
- Mix of direct and group conversations
- Realistic message history with varied timestamps

Run `python seed_db.py` after first startup to populate sample data.

## 🚢 Deployment

### Frontend (Vercel)
```bash
cd frontend
npm run build
# Deploy to Vercel via CLI or GitHub
```

### Backend (Render/Railway)
```bash
cd backend
# Set DATABASE_URL and SECRET_KEY in platform environment
# Deploy Python app with `main.py` as entry point
```

## 📝 Development Workflow

1. **Phase 1**: ✅ Project scaffolding complete
2. **Phase 2**: Database schema & models
3. **Phase 3**: Authentication flow
4. **Phase 4**: Conversation list & contacts UI
5. **Phase 5**: 1-on-1 real-time messaging
6. **Phase 6**: Group messaging
7. **Phase 7**: UI polish & Signal branding
8. **Phase 8**: Placeholder screens (calls, stories, etc.)
9. **Phase 9**: Database seeding
10. **Phase 10**: README & deployment prep

## 🛠️ Available Scripts

### Frontend
```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run lint     # Run ESLint
npm run type-check  # TypeScript checks
```

### Backend
```bash
python main.py              # Run server
python -m pytest            # Run tests
alembic revision --autogenerate  # Create migration
alembic upgrade head        # Apply migrations
```

## 📚 Project Structure Philosophy

- **Separation of Concerns**: Models, schemas, routers, services keep code modular
- **Type Safety**: TypeScript (frontend), type hints (backend)
- **Async/Await**: All I/O operations are non-blocking
- **DRY Principle**: Reusable components, schemas, utilities
- **Testability**: Router → Service → Model layers are independently testable

## 🤝 Contributing

This is an SDE assignment project. Focus areas:
- Core features before bonus features
- Code readability and maintainability
- Proper error handling and validation
- Clear architectural decisions

## 📄 License

MIT

---

**Next Step**: Move to Phase 2 - Design and implement the database schema with ER diagram.
