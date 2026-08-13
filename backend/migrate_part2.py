import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'signal_clone.db')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

try:
    cur.execute("ALTER TABLE conversations ADD COLUMN disappearing_messages_seconds INTEGER NULL")
    print("Added disappearing_messages_seconds to conversations")
except sqlite3.OperationalError as e:
    print(e)

try:
    cur.execute("ALTER TABLE messages ADD COLUMN expires_at DATETIME NULL")
    cur.execute("CREATE INDEX IF NOT EXISTS ix_messages_expires_at ON messages(expires_at)")
    print("Added expires_at to messages")
except sqlite3.OperationalError as e:
    print(e)

conn.commit()
conn.close()
print("Done")
