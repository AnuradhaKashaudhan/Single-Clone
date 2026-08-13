from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from datetime import datetime

from app.database.database import get_db
from app.models.models import (
    User, Conversation, Message, MessageReceipt,
    MessageStatus, ReceiptStatus, MessageType, Attachment, MessageReaction
)
from app.schemas import (
    MessageCreate, MessageResponse, MessageStatusUpdate,
    ReadReceiptUpdate, MessageReceiptResponse, AttachmentResponse,
    ReactionResponse, ReplyPreview
)
from app.routers.auth import get_current_user
from app.routers.websocket import manager
from fastapi.encoders import jsonable_encoder

router = APIRouter(prefix="/conversations/{conversation_id}/messages", tags=["messages"])


def _build_reply_preview(reply_msg: Message | None) -> ReplyPreview | None:
    """Build a lightweight reply preview from a related Message object."""
    if not reply_msg:
        return None
    return ReplyPreview(
        id=reply_msg.id,
        content=reply_msg.content,
        sender_display_name=reply_msg.sender.display_name if reply_msg.sender else None,
        message_type=reply_msg.message_type,
    )


def _build_message_response(msg: Message, sender: User | None = None) -> MessageResponse:
    """Build a full MessageResponse from a loaded Message ORM object."""
    s = sender or msg.sender
    receipts = [
        MessageReceiptResponse(
            user_id=r.user_id,
            username=r.user.username,
            status=r.status,
            timestamp=r.timestamp,
        )
        for r in (msg.receipts or [])
    ]
    attachments = [
        AttachmentResponse(
            id=a.id,
            file_name=a.file_name,
            file_path=a.file_path,
            mime_type=a.mime_type,
            file_size=a.file_size,
            created_at=a.created_at,
        )
        for a in (msg.attachments or [])
    ]
    reactions = [
        ReactionResponse(
            id=r.id,
            emoji=r.emoji,
            user_id=r.user_id,
            created_at=r.created_at,
        )
        for r in (msg.reactions or [])
    ]
    return MessageResponse(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_id=msg.sender_id,
        sender_username=s.username if s else None,
        sender_display_name=s.display_name if s else None,
        sender_avatar_url=s.avatar_url if s else None,
        content=msg.content,
        message_type=msg.message_type,
        reply_to_id=msg.reply_to_id,
        reply_to=_build_reply_preview(msg.reply_to),
        status=msg.status,
        created_at=msg.created_at,
        updated_at=msg.updated_at,
        receipts=receipts,
        attachments=attachments,
        reactions=reactions,
        expires_at=msg.expires_at,
    )


@router.get("", response_model=list[MessageResponse])
async def get_messages(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """Get messages from a conversation"""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .options(selectinload(Conversation.participants))
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    if current_user not in conversation.participants:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this conversation")

    query = (
        select(Message)
        .where(
            and_(
                Message.conversation_id == conversation_id,
                or_(Message.expires_at == None, Message.expires_at > datetime.utcnow())
            )
        )
        .order_by(Message.created_at.desc())
        .offset(skip)
        .limit(limit)
        .options(
            selectinload(Message.sender),
            selectinload(Message.receipts).selectinload(MessageReceipt.user),
            selectinload(Message.attachments),
            selectinload(Message.reactions),
            selectinload(Message.reply_to).selectinload(Message.sender),
        )
    )

    result = await db.execute(query)
    messages = list(reversed(result.scalars().all()))
    return [_build_message_response(msg) for msg in messages]


@router.post("", response_model=MessageResponse)
async def send_message(
    conversation_id: int,
    request: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message to a conversation"""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .options(selectinload(Conversation.participants))
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    if current_user not in conversation.participants:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this conversation")

    # Validate reply_to if provided
    if request.reply_to_id:
        r = await db.execute(
            select(Message)
            .where(Message.id == request.reply_to_id)
            .options(selectinload(Message.sender))
        )
        reply_msg = r.scalar_one_or_none()
        if not reply_msg or reply_msg.conversation_id != conversation_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reply_to_id")

    expires_at = None
    if conversation.disappearing_messages_seconds:
        from datetime import timedelta
        expires_at = datetime.utcnow() + timedelta(seconds=conversation.disappearing_messages_seconds)

    message = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=request.content,
        message_type=request.message_type,
        reply_to_id=request.reply_to_id,
        status=MessageStatus.SENT,
        expires_at=expires_at,
    )
    db.add(message)
    
    # Update conversation's updated_at timestamp to sort correctly
    conversation.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(message)

    # Create delivered receipts for all other participants
    for participant in conversation.participants:
        if participant.id != current_user.id:
            receipt = MessageReceipt(
                message_id=message.id,
                user_id=participant.id,
                status=ReceiptStatus.DELIVERED,
            )
            db.add(receipt)
    await db.commit()

    # Reload full message with relationships
    result = await db.execute(
        select(Message)
        .where(Message.id == message.id)
        .options(
            selectinload(Message.sender),
            selectinload(Message.receipts).selectinload(MessageReceipt.user),
            selectinload(Message.attachments),
            selectinload(Message.reactions),
            selectinload(Message.reply_to).selectinload(Message.sender),
        )
    )
    message = result.scalar_one()
    response = _build_message_response(message)

    # Broadcast to all participants via WebSocket
    ws_payload = {
        "type": "message",
        "message": jsonable_encoder(response),
    }
    for participant in conversation.participants:
        await manager.send_personal_message(ws_payload, participant.id)

    return response


@router.put("/{message_id}", response_model=MessageResponse)
async def update_message_status(
    conversation_id: int,
    message_id: int,
    request: MessageStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update message status (mark as read/delivered) — only sender can call"""
    result = await db.execute(
        select(Message)
        .where(Message.id == message_id)
        .options(
            selectinload(Message.sender),
            selectinload(Message.receipts).selectinload(MessageReceipt.user),
            selectinload(Message.attachments),
            selectinload(Message.reactions),
            selectinload(Message.reply_to).selectinload(Message.sender),
        )
    )
    message = result.scalar_one_or_none()

    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    if message.conversation_id != conversation_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message does not belong to this conversation")

    if message.sender_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only sender can update message status")

    message.status = request.status
    message.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(message)

    response = _build_message_response(message)

    # Broadcast delivery/read status back to sender
    ws_payload = {
        "type": "delivery_receipt",
        "message_id": message.id,
        "status": request.status.value,
        "conversation_id": message.conversation_id,
    }
    await manager.send_personal_message(ws_payload, message.sender_id)

    return response


@router.post("/mark-as-read")
async def mark_messages_as_read(
    conversation_id: int,
    request: ReadReceiptUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark multiple messages as read for current user"""
    result = await db.execute(
        select(MessageReceipt).where(
            and_(
                MessageReceipt.message_id.in_(request.message_ids),
                MessageReceipt.user_id == current_user.id,
            )
        )
    )
    receipts = result.scalars().all()

    for receipt in receipts:
        receipt.status = ReceiptStatus.READ
        receipt.timestamp = datetime.utcnow()

    await db.commit()

    # Broadcast read receipts to all other participants
    ws_payload = {
        "type": "read_receipt",
        "message_ids": request.message_ids,
        "reader_id": current_user.id,
        "conversation_id": conversation_id,
    }
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .options(selectinload(Conversation.participants))
    )
    conv = result.scalar_one_or_none()
    if conv:
        for p in conv.participants:
            if p.id != current_user.id:
                await manager.send_personal_message(ws_payload, p.id)

    return {"detail": f"Marked {len(receipts)} messages as read"}
