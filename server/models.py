from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Text
from sqlalchemy.orm import relationship
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    conversations = relationship("Conversation", back_populates="owner")
    usage_metrics = relationship("UsageMetric", back_populates="user")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, default="New Chat")
    user_id = Column(Integer, ForeignKey("users.id"))
    system_prompt = Column(Text, nullable=True)
    temperature = Column(Text, default="0.7")
    selected_model = Column(String, default="aura-standard")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation")
    attachments = relationship("Attachment", back_populates="conversation")
    feedbacks = relationship("Feedback", back_populates="conversation")


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    filename = Column(String)
    content = Column(Text) # Extracted text
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    conversation = relationship("Conversation", back_populates="attachments")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    role = Column(String)  # 'user' or 'assistant'
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")
    feedback = relationship("Feedback", back_populates="message", uselist=False)

class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"))
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    is_positive = Column(Boolean) # True for Up, False for Down
    comment = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    message = relationship("Message", back_populates="feedback")
    conversation = relationship("Conversation", back_populates="feedbacks")

class UsageMetric(Base):
    __tablename__ = "usage_metrics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    endpoint = Column(String)
    model_used = Column(String, nullable=True)
    token_count = Column(Integer, default=0)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="usage_metrics")
