# Secure Messaging Platform — Signal Clone

## Overview

This is a full-stack, real-time secure messaging platform inspired by Signal. It features a polished, responsive user interface, real-time messaging capabilities via WebSockets, group chats, delivery/read receipts, typing indicators, and a robust backend utilizing FastAPI and SQLite.

## Features

- **Real-Time Direct Messaging**: Seamless, zero-latency direct messaging using WebSockets.
- **Group Chats**: Create groups, add/remove members (admin only), and broadcast messages to all members instantly.
- **Delivery & Read Receipts**: Real-time status indicators (Sent ✓, Delivered ✓✓, Read ✓✓) dynamically updating via WebSockets.
- **Typing Indicators**: Live "User is typing..." presence broadcasted instantly.
- **Online Presence**: View who is currently online with live status updates.
- **JWT Authentication**: Secure user registration and login with encrypted passwords.
- **Search & Contacts**: Discover users on the platform and initiate direct conversations organically.
- **Dark Mode**: Beautiful, responsive, toggle-able dark and light themes spanning all UI components.
- **SQLite Persistence**: No mocked data. All users, conversations, messages, and receipts are safely persisted in SQLite.

## Tech Stack

**Frontend**:
- Framework: [Next.js](https://nextjs.org/) (React)
- Language: [TypeScript](https://www.typescriptlang.org/)
- Styling: [Tailwind CSS](https://tailwindcss.com/)
- Icons: [Lucide React](https://lucide.dev/)

**Backend**:
- Framework: [FastAPI](https://fastapi.tiangolo.com/)
- Language: Python 3
- ORM: [SQLAlchemy](https://www.sqlalchemy.org/)
- Authentication: JWT, Passlib, bcrypt

**Database**:
- [SQLite](https://www.sqlite.org/index.html) (Local Relational Database)

**Real-time**:
- Native [WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) (FastAPI endpoints + React standard WebSocket client)

---

## Architecture

The system utilizes a modern decoupled architecture:
1. **Frontend (Next.js)** acts as the presentation layer, handling UI rendering, state management, and real-time DOM updates.
2. **Backend (FastAPI)** serves as the RESTful API provider and the WebSocket hub.
3. **Database (SQLite)** handles persistent storage of all entities.
4. **WebSocket Flow**: When a user sends a message, it is first sent via a REST `POST` to the backend. The backend persists the message to SQLite and then immediately **broadcasts** the persisted message payload over the active WebSocket connections of all participating members. This avoids expensive polling and provides instant chat updates.

## Project Structure

```text
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── database/         # SQLite connection config
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── routers/          # FastAPI route controllers
│   │   ├── schemas/          # Pydantic validation schemas
│   │   └── services/         # Business logic
│   ├── run_server.py         # Entrypoint
│   └── requirements.txt      # Python dependencies
│
├── frontend/                 # Next.js Application
│   ├── src/
│   │   ├── app/              # Next.js App Router pages
│   │   ├── components/       # Reusable React components
│   │   └── lib/              # API clients & WebSocket managers
│   ├── tailwind.config.ts    # Tailwind styles
│   └── package.json          # Node dependencies
└── README.md
```

---

## Database Schema

The SQLite schema consists of the following tightly relational models:

- **Users**: Stores credentials, `display_name`, `avatar_url`, and `last_seen` timestamps.
- **Conversations**: Stores chat metadata (type: `DIRECT` or `GROUP`, and `name`).
- **ConversationMembers** (`conversation_participants`): A many-to-many association table linking Users to Conversations. Includes a `role` field to distinguish group `admins` from standard `members`.
- **Messages**: Stores message `content`, a foreign key to the `conversation`, and the `sender_id`.
- **MessageReceipts**: A tracking table referencing a `message_id` and `user_id` to persist `DELIVERED` and `READ` statuses independently for every participant in a chat.

---

## API Documentation

The backend exposes the following structured RESTful APIs:

### AUTH
- `POST /auth/register`: Register a new user.
- `POST /auth/login`: Authenticate and receive a JWT.
- `GET /auth/me`: Fetch current authenticated user details.
- `POST /auth/logout`: Invalidate session.

### USERS / CONTACTS
- `GET /users/search?q={query}`: Search for users by display name or username.
- `PUT /users/me`: Update the current user's profile/settings.

### CONVERSATIONS
- `GET /conversations`: List all conversations the user is a member of.
- `GET /conversations/{id}`: Fetch details for a specific conversation.
- `POST /conversations`: Create a new direct or group conversation.

### MESSAGES
- `GET /conversations/{id}/messages`: Fetch chronological message history.
- `POST /conversations/{id}/messages`: Send a new message to a conversation.
- `POST /conversations/{id}/messages/mark-as-read`: Bulk update receipt status to READ.

### GROUPS
- `POST /conversations/{id}/members`: (Admin) Add a user to a group.
- `DELETE /conversations/{id}/members/{user_id}`: (Admin) Remove a user from a group.

---

## WebSocket Architecture

**Endpoint**: `ws://localhost:8000/ws/socket`

WebSockets are utilized to avoid the immense overhead of HTTP polling. Rather than pinging the server every second for new messages, the client opens a persistent TCP connection. The server pushes events down to the client immediately as they happen.

**Events Broadcasted**:
- **Connection**: Authenticates via JWT token on connection.
- **New Message** (`type: "message"`): Contains full message payload.
- **Typing** (`type: "typing"`): Emitted when a user starts typing (debounced).
- **Delivery / Read Receipts** (`type: "delivery_receipt"`, `"read_receipt"`): Informs the sender that UI checkmarks should be updated.
- **Presence** (`type: "user_status"`): Updates UI to display "Online" or "Offline" dynamically.

---

## Authentication

Authentication utilizes secure **JWT (JSON Web Tokens)**. 
- Passwords are encrypted with `bcrypt` before storage.
- The `/auth/login` endpoint returns an `access_token`.
- The frontend securely stores this token and attaches it to the `Authorization: Bearer <token>` header of all subsequent API requests and the initial WebSocket handshake.
- *(Note: OTP flow is mocked for development purposes as per standard assignment parameters).*

---

## Environment Variables

The project utilizes environment variables to keep configurations modular. 
*(No secrets are committed to version control; `.env` files are in `.gitignore`)*

**Frontend (`frontend/.env.local`)**:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

**Backend (`backend/.env`)**:
```
SECRET_KEY=your_secure_jwt_secret_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

---

## Local Setup

### 1. Backend Setup
Navigate to the backend directory, set up your virtual environment, and install dependencies:
```bash
cd backend
python -m venv venv
source venv/Scripts/activate  # On Windows
pip install -r requirements.txt
```

**Running the Backend**:
```bash
python run_server.py
```
*(The backend will start at `http://localhost:8000`)*

### 2. Frontend Setup
Open a new terminal, navigate to the frontend directory, and install dependencies:
```bash
cd frontend
npm install
```

**Running the Frontend**:
```bash
npm run dev
```
*(The frontend will start at `http://localhost:3000`)*

---

## Seed Accounts

To help reviewers and evaluators quickly test the platform, several accounts are pre-seeded in the database:
- **Alice Smith**: `alice` / `password123`
- **Bob Jones**: `bob` / `password123`
- **Charlie Brown**: `charlie` / `password123`

---

## Deployment

**Frontend**: Designed to be instantly deployable to [Vercel](https://vercel.com). Simply link the repository, configure the `NEXT_PUBLIC_API_URL`, and deploy.
**Backend**: Deployable to [Render](https://render.com), [Railway](https://railway.app), or AWS EC2. Ensure CORS is correctly configured to accept the production frontend domain, and upgrade the WebSocket URL to use secure `wss://`.

---

## Assumptions & Limitations

- **Encryption**: End-to-End Encryption (E2EE) is simulated/placeholder in the UI. Implementing true E2EE requires complex client-side key generation and exchange (e.g., Signal Protocol) which is outside the scope of this phase.
- **Media**: Voice calls, video calls, and file attachments are strictly frontend UI placeholders marked as "Coming Soon".
- **Notifications**: Push notifications are UI placeholders; current notifications are strictly in-app via WebSockets.
- **Database**: SQLite is utilized as requested by the assignment parameters. For massive production scaling, migration to PostgreSQL is recommended.

## Future Improvements

- File/Image uploads utilizing AWS S3 or similar blob storage.
- Real browser Push Notifications (Service Workers).
- Integration of the actual Signal Protocol for E2EE.
- Voice & Video calling using WebRTC.
