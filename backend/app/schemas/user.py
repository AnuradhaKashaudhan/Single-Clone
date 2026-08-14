from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class UserBase(BaseModel):
    username: str
    display_name: str


class UserCreate(UserBase):
    phone_number: Optional[str] = None
    password: str
    avatar_url: Optional[str] = None


class UserResponse(UserBase):
    id: int
    phone_number: Optional[str]
    avatar_url: Optional[str]
    status: str
    last_seen: datetime
    created_at: datetime

    class Config:
        orm_mode = True


class UserInDB(UserResponse):
    password_hash: str


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    status: Optional[str] = None
