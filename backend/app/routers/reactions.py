from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from datetime import datetime

from app.database.database import get_db
from app.models.models import User, Conversation, Message, MessageReaction
from app.schemas import ReactionResponse, ReactionCreate
from app.routers.auth import get_current_user
from app.routers.websocket import manager

router = APIRouter(
    prefix="/conversations/{conversation_id}/messages/{message_id}/reactions",
    tags=["reactions"]
)

ALLOWED_EMOJIS = {"❤️", "😂", "👍", "😮", "😢", "😡"}


async def _verify_membership(conversation_id: int, current_user: User, db: AsyncSession) -> Conversation:
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .options(selectinload(Conversation.participants))
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    if current_user not in conv.participants:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this conversation")
    return conv


@router.post("", response_model=ReactionResponse)
async def add_reaction(
    conversation_id: int,
    message_id: int,
    body: ReactionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add an emoji reaction to a message (idempotent — returns existing if already present)"""
    conversation = await _verify_membership(conversation_id, current_user, db)

    # Verify message belongs to conversation
    r = await db.execute(select(Message).where(Message.id == message_id))
    message = r.scalar_one_or_none()
    if not message or message.conversation_id != conversation_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    if body.emoji not in ALLOWED_EMOJIS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Emoji not allowed. Use one of: {', '.join(ALLOWED_EMOJIS)}")

    # Check if reaction already exists (idempotent)
    existing_result = await db.execute(
        select(MessageReaction).where(
            and_(
                MessageReaction.message_id == message_id,
                MessageReaction.user_id == current_user.id,
                MessageReaction.emoji == body.emoji,
            )
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        return ReactionResponse(
            id=existing.id,
            emoji=existing.emoji,
            user_id=existing.user_id,
            created_at=existing.created_at,
        )

    reaction = MessageReaction(
        message_id=message_id,
        user_id=current_user.id,
        emoji=body.emoji,
    )
    db.add(reaction)
    await db.commit()
    await db.refresh(reaction)

    response = ReactionResponse(
        id=reaction.id,
        emoji=reaction.emoji,
        user_id=reaction.user_id,
        created_at=reaction.created_at,
    )

    # Broadcast reaction_added to all conversation participants
    ws_payload = {
        "type": "reaction_added",
        "message_id": message_id,
        "conversation_id": conversation_id,
        "emoji": reaction.emoji,
        "user_id": current_user.id,
        "reaction_id": reaction.id,
    }
    for participant in conversation.participants:
        await manager.send_personal_message(ws_payload, participant.id)

    return response


@router.delete("/{emoji}")
async def remove_reaction(
    conversation_id: int,
    message_id: int,
    emoji: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a specific emoji reaction from a message"""
    conversation = await _verify_membership(conversation_id, current_user, db)

    result = await db.execute(
        select(MessageReaction).where(
            and_(
                MessageReaction.message_id == message_id,
                MessageReaction.user_id == current_user.id,
                MessageReaction.emoji == emoji,
            )
        )
    )
    reaction = result.scalar_one_or_none()
    if not reaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reaction not found")

    await db.delete(reaction)
    await db.commit()

    # Broadcast reaction_removed to all conversation participants
    ws_payload = {
        "type": "reaction_removed",
        "message_id": message_id,
        "conversation_id": conversation_id,
        "emoji": emoji,
        "user_id": current_user.id,
    }
    for participant in conversation.participants:
        await manager.send_personal_message(ws_payload, participant.id)

    return {"detail": "Reaction removed"}
