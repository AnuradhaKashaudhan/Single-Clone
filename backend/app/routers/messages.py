from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from datetime import datetime

from app.database.database import get_db
from app.models.models import User, Conversation, Message, MessageReceipt, MessageStatus, ReceiptStatus
from app.schemas import MessageCreate, MessageResponse, MessageStatusUpdate, ReadReceiptUpdate, MessageReceiptResponse
from app.routers.auth import get_current_user
from app.routers.websocket import manager
from fastapi.encoders import jsonable_encoder

router = APIRouter(prefix="/conversations/{conversation_id}/messages", tags=["messages"])


@router.get("", response_model=list[MessageResponse])
async def get_messages(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """Get messages from a conversation"""
    # Verify user is in conversation
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

    # Get messages
    query = select(Message).where(
        Message.conversation_id == conversation_id
    ).order_by(Message.created_at.desc()).offset(skip).limit(limit).options(
        selectinload(Message.sender),
        selectinload(Message.receipts).selectinload(MessageReceipt.user)
    )

    result = await db.execute(query)
    messages = list(reversed(result.scalars().all()))

    # Build response
    response = []
    for msg in messages:
        receipts = []
        for receipt in msg.receipts:
            receipts.append(
                MessageReceiptResponse(
                    user_id=receipt.user_id,
                    username=receipt.user.username,
                    status=receipt.status,
                    timestamp=receipt.timestamp,
                )
            )

        response.append(
            MessageResponse(
                id=msg.id,
                conversation_id=msg.conversation_id,
                sender_id=msg.sender_id,
                sender_username=msg.sender.username,
                sender_display_name=msg.sender.display_name,
                sender_avatar_url=msg.sender.avatar_url,
                content=msg.content,
                status=msg.status,
                created_at=msg.created_at,
                updated_at=msg.updated_at,
                receipts=receipts,
            )
        )

    return response


@router.post("", response_model=MessageResponse)
async def send_message(
    conversation_id: int,
    request: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message to a conversation"""
    # Verify conversation exists and user is member
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

    # Create message
    message = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=request.content,
        status=MessageStatus.SENT,
    )

    db.add(message)
    await db.commit()
    await db.refresh(message)

    # Create receipts for all other participants (delivered by default)
    for participant in conversation.participants:
        if participant.id != current_user.id:
            receipt = MessageReceipt(
                message_id=message.id,
                user_id=participant.id,
                status=ReceiptStatus.DELIVERED,
            )
            db.add(receipt)

    await db.commit()
    await db.refresh(message)

    # Build response
    receipt_responses = []
    for participant in conversation.participants:
        if participant.id != current_user.id:
            receipt_responses.append(
                MessageReceiptResponse(
                    user_id=participant.id,
                    username=participant.username,
                    status=ReceiptStatus.DELIVERED,
                    timestamp=datetime.utcnow(),
                )
            )

    return MessageResponse(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        sender_username=current_user.username,
        sender_display_name=current_user.display_name,
        sender_avatar_url=current_user.avatar_url,
        content=message.content,
        status=message.status,
        created_at=message.created_at,
        updated_at=message.updated_at,
        receipts=receipt_responses,
    )
    
    # Broadcast to all participants
    ws_payload = {
        "type": "message",
        "message": jsonable_encoder(response)
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
    """Update message status (mark as read/delivered)"""
    result = await db.execute(
        select(Message)
        .where(Message.id == message_id)
        .options(
            selectinload(Message.sender),
            selectinload(Message.receipts).selectinload(MessageReceipt.user)
        )
    )
    message = result.scalar_one_or_none()

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    if message.conversation_id != conversation_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message does not belong to this conversation",
        )

    # Only sender can update message status
    if message.sender_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only sender can update message status",
        )

    message.status = request.status
    message.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(message)

    # Build response
    receipts = []
    for receipt in message.receipts:
        receipts.append(
            MessageReceiptResponse(
                user_id=receipt.user_id,
                username=receipt.user.username,
                status=receipt.status,
                timestamp=receipt.timestamp,
            )
        )

    return MessageResponse(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        sender_username=message.sender.username,
        sender_display_name=message.sender.display_name,
        sender_avatar_url=message.sender.avatar_url,
        content=message.content,
        status=message.status,
        created_at=message.created_at,
        updated_at=message.updated_at,
        receipts=receipts,
    )

    # Broadcast delivery/read status back to sender
    ws_payload = {
        "type": "delivery_receipt",
        "message_id": message.id,
        "status": request.status.value,
        "conversation_id": message.conversation_id
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
    # Update all message receipts for current user
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

    # Broadcast read receipts back to the senders
    # Group by message to find senders (in a real app, you'd join with Message to get sender_id)
    # For now, just broadcast to the conversation if we can, or send generic update
    ws_payload = {
        "type": "read_receipt",
        "message_ids": request.message_ids,
        "reader_id": current_user.id,
        "conversation_id": conversation_id
    }
    # Broadcast to everyone in the conversation
    result = await db.execute(select(Conversation).where(Conversation.id == conversation_id).options(selectinload(Conversation.participants)))
    conv = result.scalar_one_or_none()
    if conv:
        for p in conv.participants:
            if p.id != current_user.id:
                await manager.send_personal_message(ws_payload, p.id)

    return {"detail": f"Marked {len(receipts)} messages as read"}
