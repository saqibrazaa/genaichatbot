from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Request

from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import models, schemas, database
import os
import sqlalchemy as sa
import time
from collections import defaultdict
import gemini_utils




# Create tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Gen AI API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Mock AI Service ---
def get_ai_response(message: str, model: str = "aura-standard", context: str = "", temperature: float = 0.7) -> str:
    prefix = f"[{model}] "
    
    # Model specific logic
    if "creative" in model:
        behavior = "I'm feeling creative! "
    elif "precise" in model:
        behavior = "Precisely: "
    else:
        behavior = ""

    # Temperature logic
    if temperature > 1.5:
        behavior += "(Highly Random) "
    elif temperature < 0.3:
        behavior += "(Deterministic) "

    # --- Tool Calling Mock ---
    tool_triggered = None
    if "search" in message.lower():
        tool_triggered = "Web Search Tool"
        tool_output = f"Successfully searched for '{message}'. Found 3 relevant results."
        behavior += f"[System: Used {tool_triggered}] "
    elif "weather" in message.lower():
        tool_triggered = "Weather API"
        tool_output = "Current weather: 72°F, Sunny."
        behavior += f"[System: Used {tool_triggered}] "

    if context:
        # Simple RAG extraction: filter context for relevant keywords
        keywords = message.lower().split()
        relevant_context = [line for line in context.split('\n') if any(word in line.lower() for word in keywords if len(word) > 3)]
        context_str = "\n".join(relevant_context[:5]) if relevant_context else "general context"
        
        response = f"{prefix}{behavior}Based on the documents: '{context_str}', here is my response to '{message}'"
        if tool_triggered:
            response = f"{prefix}{behavior}I used the {tool_triggered}. Result: {tool_output}. Based on that and your documents: {response}"
        return response
    
    # --- Real Gemini Integration ---
    print(f"Calling Gemini with message: {message[:50]}...")
    gemini_resp = gemini_utils.get_gemini_response(
        message, 
        context=context, 
        model_name="gemini-flash-latest", # Or map selectedModel if needed
        temperature=temperature
    )

    if gemini_resp:
        print("Gemini response received.")
        return f"{prefix}{behavior}{gemini_resp}"

    print("Gemini failed, falling back to mock.")
    return f"{prefix}{behavior}This is a mock response to: '{message}'"



# --- Rate Limiter ---
user_request_counts = defaultdict(list)
RATE_LIMIT_SECONDS = 60
MAX_REQUESTS = 10

def check_rate_limit(user_ip: str):
    now = time.time()
    # Filter out timestamps older than current window
    user_request_counts[user_ip] = [t for t in user_request_counts[user_ip] if now - t < RATE_LIMIT_SECONDS]
    
    if len(user_request_counts[user_ip]) >= MAX_REQUESTS:
        return False
    
    user_request_counts[user_ip].append(now)
    return True



# --- Endpoints ---

@app.get("/")
async def root():
    return {"message": "Gen AI API is running"}

@app.post("/conversations", response_model=schemas.Conversation)
def create_conversation(conversation: schemas.ConversationCreate, db: Session = Depends(get_db)):
    try:
        db_conversation = models.Conversation(
            title=conversation.title,
            system_prompt=conversation.system_prompt,
            temperature=conversation.temperature,
            selected_model=conversation.selected_model
        )
        db.add(db_conversation)
        db.commit()
        db.refresh(db_conversation)
        return db_conversation
    except Exception as e:
        print(f"ERROR CREATING CONVERSATION: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/conversations", response_model=List[schemas.Conversation])
def read_conversations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    conversations = db.query(models.Conversation).order_by(models.Conversation.updated_at.desc()).offset(skip).limit(limit).all()
    return conversations

@app.get("/conversations/{conversation_id}", response_model=schemas.Conversation)
def read_conversation(conversation_id: int, db: Session = Depends(get_db)):
    conversation = db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation

@app.patch("/conversations/{conversation_id}", response_model=schemas.Conversation)
def update_conversation(conversation_id: int, conversation_update: schemas.ConversationUpdate, db: Session = Depends(get_db)):
    db_conversation = db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()
    if not db_conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    update_data = conversation_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_conversation, key, value)
    
    db.commit()
    db.refresh(db_conversation)
    return db_conversation

@app.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: int, db: Session = Depends(get_db)):
    db_conversation = db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()
    if not db_conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Delete associated messages and attachments first
    db.query(models.Message).filter(models.Message.conversation_id == conversation_id).delete()
    db.query(models.Attachment).filter(models.Attachment.conversation_id == conversation_id).delete()
    
    db.delete(db_conversation)
    db.commit()
    return {"message": "Conversation deleted"}

@app.post("/upload", response_model=schemas.Attachment)
async def upload_file(conversation_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Verify conversation exists
    conversation = db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    content = await file.read()
    text_content = ""
    
    # If it's an image, use Gemini Image Analysis
    image_analysis = ""
    if file.content_type.startswith("image/"):
        image_analysis = gemini_utils.analyze_report_image(content, file.content_type)
        text_content = f"[Image Analysis Result]\n{image_analysis}"
    elif file.filename.endswith(('.txt', '.md', '.py', '.js', '.jsx', '.css')):
        text_content = content.decode("utf-8")
        # Check if it looks like a medical report to suggest analysis
        if any(keyword in text_content.lower() for keyword in ["blood", "test", "report", "lab", "result"]):
            text_content = gemini_utils.analyze_report_text(text_content)
    else:
        text_content = "[Binary/Unsupported file content - Name: " + file.filename + "]"

    db_attachment = models.Attachment(
        conversation_id=conversation_id,
        filename=file.filename,
        content=text_content
    )
    db.add(db_attachment)
    db.commit()
    db.refresh(db_attachment)
    return db_attachment


@app.post("/conversations/{conversation_id}/messages", response_model=schemas.Message)
def create_message(conversation_id: int, message: schemas.MessageCreate, request: Request, db: Session = Depends(get_db)):
    print(f"RECEIVED MESSAGE: conv={conversation_id}, content={message.content[:50]}")
    # Rate limiting

    client_ip = request.client.host
    if not check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Too many requests. Rate limit is 10 messages per minute.")

    # Verify conversation exists

    conversation = db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # 1. Save User Message
    db_user_message = models.Message(conversation_id=conversation_id, role="user", content=message.content)
    db.add(db_user_message)
    db.commit()

    # 2. Gather context from attachments (Simple RAG)
    attachments = db.query(models.Attachment).filter(models.Attachment.conversation_id == conversation_id).all()
    context = "\n".join([att.content for att in attachments]) if attachments else ""

    # 3. Get AI Response with model selection and context
    ai_response_content = get_ai_response(
        message.content, 
        model=conversation.selected_model or "aura-standard",
        context=context,
        temperature=float(conversation.temperature or 0.7)
    )

    # 4. Save AI Message
    db_ai_message = models.Message(conversation_id=conversation_id, role="assistant", content=ai_response_content)
    db.add(db_ai_message)
    
    # 5. Track Usage
    metric = models.UsageMetric(
        endpoint="/chat",
        model_used=conversation.selected_model or "aura-standard",
        token_count=len(message.content.split()) + len(ai_response_content.split()) # Rough estimate
    )
    db.add(metric)

    # Updated_at is handled by the model's onupdate
    db.commit()

    db.refresh(db_ai_message)
    
    return db_ai_message

@app.post("/feedback", response_model=schemas.Feedback)
def create_feedback(feedback: schemas.FeedbackCreate, db: Session = Depends(get_db)):
    db_feedback = models.Feedback(**feedback.dict())
    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)
    return db_feedback

@app.get("/analytics", response_model=schemas.AnalyticsSummary)
def get_analytics(db: Session = Depends(get_db)):
    total_messages = db.query(models.Message).count()
    total_tokens = db.query(sa.func.sum(models.UsageMetric.token_count)).scalar() or 0
    positive_feedback = db.query(models.Feedback).filter(models.Feedback.is_positive == True).count()
    negative_feedback = db.query(models.Feedback).filter(models.Feedback.is_positive == False).count()
    
    # Simple model distribution
    models_used = db.query(models.UsageMetric.model_used, sa.func.count(models.UsageMetric.id)).group_by(models.UsageMetric.model_used).all()
    model_dist = {str(m): count for m, count in models_used}


    return {
        "total_messages": total_messages,
        "total_tokens": int(total_tokens),
        "model_distribution": model_dist,
        "positive_feedback_count": positive_feedback,
        "negative_feedback_count": negative_feedback
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
