from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.database.database import get_db
from app.models.models import User
from app.schemas.user import UserResponse
from app.routers.auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/search", response_model=list[UserResponse])
async def search_users(
    q: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(20, le=50)
):
    """Search users by username or display name"""
    search_term = f"%{q}%"
    query = select(User).where(
        or_(
            User.username.ilike(search_term),
            User.display_name.ilike(search_term)
        )
    ).limit(limit)
    
    result = await db.execute(query)
    users = result.scalars().all()
    
    return [
        UserResponse(
            id=user.id,
            username=user.username,
            display_name=user.display_name,
            phone_number=user.phone_number,
            avatar_url=user.avatar_url,
            status=user.status,
            last_seen=user.last_seen,
            created_at=user.created_at,
            updated_at=user.updated_at
        ) for user in users
    ]
