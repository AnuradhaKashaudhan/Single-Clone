import sqlite3
from pathlib import Path

db = Path(__file__).parent / "signal_clone.db"
conn = sqlite3.connect(str(db))
cur = conn.cursor()

# Get existing columns
cols = [r[1] for r in cur.execute("PRAGMA table_info(messages)")]
print("Existing columns:", cols)

if "message_type" not in cols:
    cur.execute("ALTER TABLE messages ADD COLUMN message_type VARCHAR DEFAULT 'text'")
    print("Added message_type")

if "reply_to_id" not in cols:
    cur.execute("ALTER TABLE messages ADD COLUMN reply_to_id INTEGER REFERENCES messages(id)")
    print("Added reply_to_id")

conn.commit()
conn.close()
print("Done!")
