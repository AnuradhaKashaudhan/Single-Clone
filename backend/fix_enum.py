import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'signal_clone.db')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("UPDATE messages SET message_type = 'TEXT' WHERE message_type = 'text'")
cur.execute("UPDATE messages SET message_type = 'IMAGE' WHERE message_type = 'image'")
cur.execute("UPDATE messages SET message_type = 'FILE' WHERE message_type = 'file'")

conn.commit()
print("Updated message_type to uppercase to match SQLAlchemy Enum names.")
conn.close()
