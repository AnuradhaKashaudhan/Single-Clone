from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ContactResponse(BaseModel):
    id: int
    username: str
    display_name: str
    avatar_url: Optional[str]
    phone_number: Optional[str]
    status: str
    last_seen: datetime

    class Config:
        from_attributes = True


class ContactSearchRequest(BaseModel):
    query: str  # Search by username, display_name, or phone_number
