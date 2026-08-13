"""
Simpler database seeding script using synchronous SQLAlchemy
"""

import sqlite3
from datetime import datetime, timedelta
import random
from passlib.context import CryptContext

# Use passlib for password hashing (consistent with auth.py)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hash password with bcrypt using passlib"""
    return pwd_context.hash(password)

# Create database and schema
def create_database():
    conn = sqlite3.connect("signal_clone.db")
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            phone_number TEXT UNIQUE,
            display_name TEXT NOT NULL,
            avatar_url TEXT,
            status TEXT DEFAULT 'offline',
            last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create conversations table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL DEFAULT 'DIRECT',
            name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create conversation_participants table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS conversation_participants (
            conversation_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            role TEXT DEFAULT 'MEMBER',
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (conversation_id, user_id),
            FOREIGN KEY (conversation_id) REFERENCES conversations(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # Create messages table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            sender_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            status TEXT DEFAULT 'SENT',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id),
            FOREIGN KEY (sender_id) REFERENCES users(id)
        )
    ''')
    
    # Create message_receipts table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS message_receipts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            status TEXT DEFAULT 'DELIVERED',
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (message_id) REFERENCES messages(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # Create indexes
    cursor.execute('CREATE INDEX IF NOT EXISTS ix_messages_conversation_id ON messages(conversation_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS ix_messages_sender_id ON messages(sender_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS ix_receipts_message_id ON message_receipts(message_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS ix_receipts_user_id ON message_receipts(user_id)')
    
    conn.commit()
    return conn


def seed_users(conn):
    """Create 5 sample users"""
    cursor = conn.cursor()
    
    users_data = [
        {
            "username": "alice_smith",
            "phone_number": "+1-555-0101",
            "display_name": "Alice Smith",
            "avatar_url": "https://i.pravatar.cc/150?img=1",
            "status": "online",
        },
        {
            "username": "bob_jones",
            "phone_number": "+1-555-0102",
            "display_name": "Bob Jones",
            "avatar_url": "https://i.pravatar.cc/150?img=2",
            "status": "online",
        },
        {
            "username": "carol_white",
            "phone_number": "+1-555-0103",
            "display_name": "Carol White",
            "avatar_url": "https://i.pravatar.cc/150?img=3",
            "status": "away",
        },
        {
            "username": "david_brown",
            "phone_number": "+1-555-0104",
            "display_name": "David Brown",
            "avatar_url": "https://i.pravatar.cc/150?img=4",
            "status": "offline",
        },
        {
            "username": "emma_davis",
            "phone_number": "+1-555-0105",
            "display_name": "Emma Davis",
            "avatar_url": "https://i.pravatar.cc/150?img=5",
            "status": "online",
        },
    ]
    
    user_ids = []
    # Generate bcrypt hash for password "password123"
    password_hash = hash_password("password123")
    
    for data in users_data:
        cursor.execute('''
            INSERT INTO users (username, phone_number, display_name, avatar_url, status, password_hash)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            data["username"],
            data["phone_number"],
            data["display_name"],
            data["avatar_url"],
            data["status"],
            password_hash,
        ))
        user_ids.append(cursor.lastrowid)
    
    conn.commit()
    print(f"✓ Created {len(user_ids)} users")
    return user_ids


def seed_conversations(conn, user_ids):
    """Create sample conversations"""
    cursor = conn.cursor()
    
    # Direct conversations
    convs = [
        ("DIRECT", None, [user_ids[0], user_ids[1]]),
        ("DIRECT", None, [user_ids[0], user_ids[2]]),
        ("DIRECT", None, [user_ids[1], user_ids[4]]),
        ("GROUP", "Team Alpha", [user_ids[0], user_ids[1], user_ids[2]]),
        ("GROUP", "Friends", user_ids),
    ]
    
    conv_ids = []
    for conv_type, name, participants in convs:
        cursor.execute('''
            INSERT INTO conversations (type, name)
            VALUES (?, ?)
        ''', (conv_type, name))
        conv_id = cursor.lastrowid
        conv_ids.append(conv_id)
        
        # Add participants
        for user_id in participants:
            cursor.execute('''
                INSERT INTO conversation_participants (conversation_id, user_id)
                VALUES (?, ?)
            ''', (conv_id, user_id))
    
    conn.commit()
    print(f"✓ Created {len(conv_ids)} conversations")
    return conv_ids


def seed_messages(conn, conv_ids, user_ids):
    """Create sample messages"""
    cursor = conn.cursor()
    
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
    total_messages = 0
    
    for conv_id in conv_ids:
        # Get participants for this conversation
        cursor.execute('''
            SELECT user_id FROM conversation_participants WHERE conversation_id = ?
        ''', (conv_id,))
        participants = [row[0] for row in cursor.fetchall()]
        
        # Create random messages
        num_messages = random.randint(5, 15)
        for _ in range(num_messages):
            sender_id = random.choice(participants)
            message_time = (now - timedelta(hours=random.randint(0, 72))).isoformat().replace('T', ' ')
            content = random.choice(message_templates)
            status = random.choice(["SENT", "DELIVERED", "READ"])
            
            cursor.execute('''
                INSERT INTO messages (conversation_id, sender_id, content, status, created_at)
                VALUES (?, ?, ?, ?, ?)
            ''', (conv_id, sender_id, content, status, message_time))
            
            message_id = cursor.lastrowid
            total_messages += 1
            
            # Add read receipts for other participants
            for recipient_id in participants:
                if recipient_id != sender_id:
                    receipt_status = random.choice(["DELIVERED", "DELIVERED", "READ"])
                    receipt_time = (datetime.fromisoformat(message_time.replace(' ', 'T')) + timedelta(seconds=random.randint(5, 300))).isoformat().replace('T', ' ')
                    
                    cursor.execute('''
                        INSERT INTO message_receipts (message_id, user_id, status, timestamp)
                        VALUES (?, ?, ?, ?)
                    ''', (message_id, recipient_id, receipt_status, receipt_time))
    
    conn.commit()
    print(f"✓ Created {total_messages} messages with receipts")


def main():
    print("🌱 Seeding Signal Messenger Clone database...")
    
    try:
        conn = create_database()
        print("✓ Database tables created")
        
        user_ids = seed_users(conn)
        conv_ids = seed_conversations(conn, user_ids)
        seed_messages(conn, conv_ids, user_ids)
        
        conn.close()
        
        print("\n✅ Database seeding completed successfully!")
        print("\nSample users (password: 'password123'):")
        for i, username in enumerate(["alice_smith", "bob_jones", "carol_white", "david_brown", "emma_davis"], 1):
            print(f"  {i}. {username}")
        print("\n📁 Database file: signal_clone.db")
        
    except Exception as e:
        print(f"\n❌ Error during seeding: {str(e)}")
        raise


if __name__ == "__main__":
    main()
