from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.database.database import get_db
from app.models.models import User
from app.schemas.user import UserResponse, UserUpdate
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
        ) for user in users
    ]

@router.put("/me", response_model=UserResponse)
async def update_current_user(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user profile"""
    if update_data.display_name is not None:
        current_user.display_name = update_data.display_name
    if update_data.avatar_url is not None:
        current_user.avatar_url = update_data.avatar_url
    if update_data.status is not None:
        current_user.status = update_data.status

    await db.commit()
    await db.refresh(current_user)

    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        display_name=current_user.display_name,
        phone_number=current_user.phone_number,
        avatar_url=current_user.avatar_url,
        status=current_user.status,
        last_seen=current_user.last_seen,
        created_at=current_user.created_at,
    )
