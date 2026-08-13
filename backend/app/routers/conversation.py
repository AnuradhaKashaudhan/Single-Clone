from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from datetime import datetime

from app.database.database import get_db
from app.models.models import User, Conversation, Message, MessageReceipt, ConversationType, conversation_participants
from app.schemas import (
    ConversationCreate, 
    ConversationResponse, 
    ConversationListItem, 
    AddParticipantRequest, 
    RemoveParticipantRequest, 
    UpdateDisappearingTimerRequest, 
    UserResponse, 
    ConversationParticipantResponse
)
from app.routers.auth import get_current_user
from app.models.models import UserRole
from app.routers.websocket import manager

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("", response_model=list[ConversationListItem])
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """List all conversations for current user, ordered by most recent activity"""
    # Get all conversations where user is a participant
    query = select(Conversation).join(
        conversation_participants,
        Conversation.id == conversation_participants.c.conversation_id
    ).where(
        conversation_participants.c.user_id == current_user.id
    ).order_by(Conversation.updated_at.desc()).options(selectinload(Conversation.participants))

    result = await db.execute(query)
    conversations = result.scalars().all()

    # Build response with last message info and unread count
    response = []
    for conv in conversations:
        # Get last message
        msg_result = await db.execute(
            select(Message).where(
                Message.conversation_id == conv.id
            ).order_by(Message.created_at.desc()).limit(1)
        )
        last_message = msg_result.scalar_one_or_none()

        # Get unread count for current user
        unread_result = await db.execute(
            select(Message).where(
                and_(
                    Message.conversation_id == conv.id,
                    Message.sender_id != current_user.id,
                    Message.status != "read"
                )
            )
        )
        unread_count = len(unread_result.scalars().all())

        # Get participant roles
        roles_result = await db.execute(
            select(conversation_participants.c.user_id, conversation_participants.c.role)
            .where(conversation_participants.c.conversation_id == conv.id)
        )
        roles_map = {row.user_id: row.role for row in roles_result.all()}

        # Get participants
        participants = []
        for participant in conv.participants:
            participants.append(
                ConversationParticipantResponse(
                    id=participant.id,
                    username=participant.username,
                    display_name=participant.display_name,
                    phone_number=participant.phone_number,
                    avatar_url=participant.avatar_url,
                    status=participant.status,
                    role=roles_map.get(participant.id, UserRole.MEMBER)
                )
            )

        response.append(
            ConversationListItem(
                id=conv.id,
                type=conv.type,
                name=conv.name,
                last_message_preview=last_message.content[:50] if last_message else None,
                last_message_timestamp=last_message.created_at if last_message else None,
                unread_count=unread_count,
                participants=participants,
            )
        )

    return response[skip : skip + limit]


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get conversation details"""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .options(selectinload(Conversation.participants))
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    # Check if user is a participant
    if current_user not in conversation.participants:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this conversation",
        )

    # Get participant roles
    roles_result = await db.execute(
        select(conversation_participants.c.user_id, conversation_participants.c.role)
        .where(conversation_participants.c.conversation_id == conversation.id)
    )
    roles_map = {row.user_id: row.role for row in roles_result.all()}

    # Build response
    participants = []
    for participant in conversation.participants:
        participants.append(
            ConversationParticipantResponse(
                id=participant.id,
                username=participant.username,
                display_name=participant.display_name,
                phone_number=participant.phone_number,
                avatar_url=participant.avatar_url,
                status=participant.status,
                role=roles_map.get(participant.id, UserRole.MEMBER)
            )
        )

    # Get last message
    msg_result = await db.execute(
        select(Message).where(
            Message.conversation_id == conversation_id
        ).order_by(Message.created_at.desc()).limit(1)
    )
    last_message = msg_result.scalar_one_or_none()

    return ConversationResponse(
        id=conversation.id,
        type=conversation.type,
        name=conversation.name,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        participants=participants,
        last_message_preview=last_message.content[:50] if last_message else None,
        last_message_timestamp=last_message.created_at if last_message else None,
        unread_count=0,  # TODO: Implement unread tracking
    )


@router.post("", response_model=ConversationResponse)
async def create_conversation(
    request: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new conversation"""
    # Get all participants including current user
    all_participant_ids = list(set(request.participant_ids + [current_user.id]))

    # Validate that at least 2 participants
    if len(all_participant_ids) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conversation requires at least 2 participants",
        )

    # For direct conversations, must be exactly 2 participants
    if request.type == ConversationType.DIRECT and len(all_participant_ids) != 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Direct conversation must have exactly 2 participants",
        )

    # Group conversation requires a name
    if request.type == ConversationType.GROUP and not request.name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Group conversation requires a name",
        )

    # Get all participant users
    result = await db.execute(
        select(User).where(User.id.in_(all_participant_ids))
    )
    participants = result.scalars().all()

    if len(participants) != len(all_participant_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more participants not found",
        )

    # Create conversation
    new_conversation = Conversation(
        type=request.type,
        name=request.name,
        participants=participants,
    )

    db.add(new_conversation)
    await db.commit()
    await db.refresh(new_conversation)

    if request.type == ConversationType.GROUP:
        await db.execute(
            conversation_participants.update().where(
                and_(
                    conversation_participants.c.conversation_id == new_conversation.id,
                    conversation_participants.c.user_id == current_user.id
                )
            ).values(role=UserRole.ADMIN)
        )
        await db.commit()

    # Get participant roles
    roles_result = await db.execute(
        select(conversation_participants.c.user_id, conversation_participants.c.role)
        .where(conversation_participants.c.conversation_id == new_conversation.id)
    )
    roles_map = {row.user_id: row.role for row in roles_result.all()}

    # Build response
    participant_responses = []
    for p in participants:
        participant_responses.append(
            ConversationParticipantResponse(
                id=p.id,
                username=p.username,
                display_name=p.display_name,
                phone_number=p.phone_number,
                avatar_url=p.avatar_url,
                status=p.status,
                role=roles_map.get(p.id, UserRole.MEMBER)
            )
        )

    return ConversationResponse(
        id=new_conversation.id,
        type=new_conversation.type,
        name=new_conversation.name,
        created_at=new_conversation.created_at,
        updated_at=new_conversation.updated_at,
        participants=participant_responses,
    )


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a conversation (only conversation creator can delete)"""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .options(selectinload(Conversation.participants))
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    if current_user not in conversation.participants:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this conversation",
        )

    await db.delete(conversation)
    await db.commit()

    return {"detail": "Conversation deleted successfully"}


@router.post("/{conversation_id}/members", response_model=ConversationResponse)
async def add_member(
    conversation_id: int,
    request: AddParticipantRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a member to a conversation"""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .options(selectinload(Conversation.participants))
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    if current_user not in conversation.participants:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this conversation",
        )

    # Get new member
    result = await db.execute(
        select(User).where(User.id == request.user_id)
    )
    new_member = result.scalar_one_or_none()

    if not new_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if new_member in conversation.participants:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member",
        )

    conversation.participants.append(new_member)
    await db.commit()
    await db.refresh(conversation)

    # Get participant roles
    roles_result = await db.execute(
        select(conversation_participants.c.user_id, conversation_participants.c.role)
        .where(conversation_participants.c.conversation_id == conversation.id)
    )
    roles_map = {row.user_id: row.role for row in roles_result.all()}

    # Build response
    participant_responses = []
    for p in conversation.participants:
        participant_responses.append(
            ConversationParticipantResponse(
                id=p.id,
                username=p.username,
                display_name=p.display_name,
                phone_number=p.phone_number,
                avatar_url=p.avatar_url,
                status=p.status,
                role=roles_map.get(p.id, UserRole.MEMBER)
            )
        )

    return ConversationResponse(
        id=conversation.id,
        type=conversation.type,
        name=conversation.name,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        participants=participant_responses,
    )


@router.delete("/{conversation_id}/members/{user_id}")
async def remove_member(
    conversation_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a member from a conversation"""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .options(selectinload(Conversation.participants))
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    if current_user not in conversation.participants:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this conversation",
        )

    if conversation.type == ConversationType.GROUP:
        # Check if current user is admin OR removing themselves
        if current_user.id != user_id:
            role_result = await db.execute(
                select(conversation_participants.c.role)
                .where(
                    and_(
                        conversation_participants.c.conversation_id == conversation_id,
                        conversation_participants.c.user_id == current_user.id
                    )
                )
            )
            role = role_result.scalar_one_or_none()
            if role != UserRole.ADMIN:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only admins can remove other members",
                )

    # Get member to remove
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    member = result.scalar_one_or_none()

    if not member or member not in conversation.participants:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in conversation",
        )

    conversation.participants.remove(member)
    await db.commit()

    return {"detail": "Member removed successfully"}


@router.put("/{conversation_id}/disappearing", response_model=ConversationResponse)
async def update_disappearing_timer(
    conversation_id: int,
    request: UpdateDisappearingTimerRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update disappearing messages timer for a conversation"""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .options(selectinload(Conversation.participants))
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    if current_user not in conversation.participants:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this conversation",
        )

    if conversation.type == ConversationType.GROUP:
        # Check if admin
        role_result = await db.execute(
            select(conversation_participants.c.role)
            .where(
                and_(
                    conversation_participants.c.conversation_id == conversation_id,
                    conversation_participants.c.user_id == current_user.id
                )
            )
        )
        role = role_result.scalar_one_or_none()
        if role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can change settings",
            )

    conversation.disappearing_messages_seconds = request.disappearing_messages_seconds
    conversation.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(conversation)

    # Get participant roles for response
    roles_result = await db.execute(
        select(conversation_participants.c.user_id, conversation_participants.c.role)
        .where(conversation_participants.c.conversation_id == conversation_id)
    )
    roles_map = {row.user_id: row.role for row in roles_result.all()}

    participant_responses = []
    for p in conversation.participants:
        participant_responses.append(
            ConversationParticipantResponse(
                id=p.id,
                username=p.username,
                display_name=p.display_name,
                avatar_url=p.avatar_url,
                status=p.status,
                role=roles_map.get(p.id, UserRole.MEMBER)
            )
        )

    response = ConversationResponse(
        id=conversation.id,
        type=conversation.type,
        name=conversation.name,
        disappearing_messages_seconds=conversation.disappearing_messages_seconds,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        participants=participant_responses,
        unread_count=0
    )

    # Broadcast settings change
    ws_payload = {
        "type": "settings_updated",
        "conversation_id": conversation.id,
        "disappearing_messages_seconds": request.disappearing_messages_seconds,
    }
    for p in conversation.participants:
        await manager.send_personal_message(ws_payload, p.id)

    return response
