import os
import uuid
import aiofiles
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from datetime import datetime

from app.database.database import get_db
from app.models.models import User, Conversation, Message, Attachment, MessageType
from app.schemas import AttachmentResponse
from app.routers.auth import get_current_user
from app.routers.websocket import manager
from fastapi.encoders import jsonable_encoder

router = APIRouter(prefix="/conversations/{conversation_id}/messages/{message_id}/attachment", tags=["attachments"])

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")

# Max file size: 20 MB
MAX_FILE_SIZE = 20 * 1024 * 1024

# Allowed MIME types
ALLOWED_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
    "application/x-zip-compressed",
}

IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"}


@router.post("", response_model=AttachmentResponse)
async def upload_attachment(
    conversation_id: int,
    message_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a file attachment for a message"""
    # Verify conversation membership
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

    # Verify the message belongs to this conversation and this user
    r = await db.execute(select(Message).where(Message.id == message_id))
    message = r.scalar_one_or_none()
    if not message or message.conversation_id != conversation_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    if message.sender_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot attach to another user's message")

    # Validate MIME type
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"File type '{content_type}' not supported. Allowed: images, PDF, TXT, DOC, DOCX, ZIP"
        )

    # Read and validate size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)} MB"
        )

    # Ensure uploads directory exists
    os.makedirs(UPLOADS_DIR, exist_ok=True)

    # Generate unique filename to prevent collisions
    ext = os.path.splitext(file.filename or "file")[1]
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOADS_DIR, unique_name)

    # Write file to disk
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(contents)

    # Determine message type based on MIME
    msg_type = MessageType.IMAGE if content_type in IMAGE_TYPES else MessageType.FILE
    message.message_type = msg_type
    message.updated_at = datetime.utcnow()

    # Create Attachment record
    relative_path = f"/uploads/{unique_name}"
    attachment = Attachment(
        message_id=message_id,
        file_name=file.filename or unique_name,
        file_path=relative_path,
        mime_type=content_type,
        file_size=len(contents),
    )
    db.add(attachment)
    await db.commit()
    await db.refresh(attachment)

    response = AttachmentResponse(
        id=attachment.id,
        file_name=attachment.file_name,
        file_path=attachment.file_path,
        mime_type=attachment.mime_type,
        file_size=attachment.file_size,
        created_at=attachment.created_at,
    )

    # Broadcast attachment_added to all conversation participants
    ws_payload = {
        "type": "attachment_added",
        "message_id": message_id,
        "conversation_id": conversation_id,
        "attachment": jsonable_encoder(response),
        "message_type": msg_type.value,
    }
    for participant in conversation.participants:
        await manager.send_personal_message(ws_payload, participant.id)

    return response
