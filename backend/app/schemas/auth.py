from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TokenData(BaseModel):
    sub: str  # username
    exp: Optional[datetime] = None


class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int


class LoginRequest(BaseModel):
    username: Optional[str] = None
    phone_number: Optional[str] = None
    password: str

    class Config:
        json_schema_extra = {
            "example": {
                "username": "john_doe",
                "password": "securepassword123"
            }
        }


class RegisterRequest(BaseModel):
    username: str
    phone_number: Optional[str] = None
    display_name: str
    password: str
    avatar_url: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "username": "john_doe",
                "phone_number": "+1234567890",
                "display_name": "John Doe",
                "password": "securepassword123"
            }
        }


class OTPVerifyRequest(BaseModel):
    """Mocked OTP verification - always accepts '123456'"""
    phone_number: str
    otp_code: str

    class Config:
        json_schema_extra = {
            "example": {
                "phone_number": "+1234567890",
                "otp_code": "123456"
            }
        }


class OTPSendRequest(BaseModel):
    """Send OTP to phone number - mocked"""
    phone_number: str

    class Config:
        json_schema_extra = {
            "example": {
                "phone_number": "+1234567890"
            }
        }
