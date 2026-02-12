from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import models

# --- Feedback Schemas ---
class FeedbackBase(BaseModel):
    is_positive: bool
    comment: Optional[str] = None

class FeedbackCreate(FeedbackBase):
    message_id: int
    conversation_id: int

class Feedback(FeedbackBase):
    id: int
    message_id: int
    conversation_id: int
    created_at: datetime

    class Config:
        orm_mode = True

# --- Message Schemas ---
class MessageBase(BaseModel):
    role: str = "user"
    content: str

class MessageCreate(MessageBase):
    pass

class Message(MessageBase):
    id: int
    conversation_id: int
    created_at: datetime
    feedback: Optional[Feedback] = None

    class Config:
        orm_mode = True



# --- Attachment Schemas ---
class AttachmentBase(BaseModel):
    filename: str

class AttachmentCreate(AttachmentBase):
    content: str
    conversation_id: int

class Attachment(AttachmentBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True

# --- Conversation Schemas ---
class ConversationBase(BaseModel):
    title: Optional[str] = "New Chat"
    system_prompt: Optional[str] = None
    temperature: Optional[float] = 0.7
    selected_model: Optional[str] = "aura-standard"

class ConversationCreate(ConversationBase):
    pass

class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    system_prompt: Optional[str] = None
    temperature: Optional[float] = None
    selected_model: Optional[str] = None

class Conversation(ConversationBase):
    id: int
    user_id: Optional[int] = None
    system_prompt: Optional[str] = None
    temperature: Optional[float] = 0.7
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    messages: List[Message] = []
    attachments: List[Attachment] = []

    class Config:
        orm_mode = True

# --- Analytics Schemas ---
class UsageMetric(BaseModel):
    id: int
    endpoint: str
    model_used: Optional[str] = None
    token_count: int
    timestamp: datetime

    class Config:
        orm_mode = True

class AnalyticsSummary(BaseModel):
    total_messages: int
    total_tokens: int
    model_distribution: dict
    positive_feedback_count: int
    negative_feedback_count: int

