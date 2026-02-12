import google.generativeai as genai
import os
from dotenv import load_dotenv
import PIL.Image
import io

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def analyze_report_text(text: str) -> str:
    """Analyze medical report text using Gemini."""
    if not GEMINI_API_KEY:
        return "⚠️ Gemini API key not set. Analysis disabled."
    
    try:
        model = genai.GenerativeModel("gemini-flash-latest") # Using verified flash model
        prompt = f"""
You are a medical lab report analysis AI.

Return output ONLY in this markdown format:

## 📄 Report Summary
- <2 line brief summary>

## 🧪 Key Findings
- Hemoglobin: xx (Low/Normal/High)
- PCV: xx (Low/Normal/High)
- Platelets: xx (Low/Normal/High)
- Other key values if present

## 🚨 Possible Health Risks
- ...

## 🩺 Suggested Actions
- ...
- ...
- ...

## ⚠️ Severity
Low / Medium / High

### ❗ Disclaimer
AI generated. Consult a doctor.

Analyze this report:
{text}
"""
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Gemini Text Analysis Error: {e}")
        return "AI analysis failed."

def analyze_report_image(image_bytes: bytes, mime_type: str) -> str:
    """Analyze medical report image using Gemini."""
    if not GEMINI_API_KEY:
        return "⚠️ Gemini API key not set. Analysis disabled."
    
    try:
        model = genai.GenerativeModel("gemini-flash-latest")
        img = PIL.Image.open(io.BytesIO(image_bytes))
        
        prompt = """
You are a medical lab report analysis AI.

Return only markdown in this format:

### Report Summary
- 1–2 line high-level summary

### Key Findings
- Test: value (Low/Normal/High)

### Possible Health Risks
- ...

### Suggested Actions
- ...
- ...
- ...

### Severity
Low / Medium / High

### Disclaimer
AI generated. Consult a doctor.
"""
        response = model.generate_content([prompt, img])
        return response.text
    except Exception as e:
        print(f"Gemini Image Analysis Error: {e}")
        return "Error analyzing image report."

def get_gemini_response(message: str, history: list = None, context: str = "", model_name: str = "gemini-flash-latest", temperature: float = 0.7) -> str:
    """General purpose Gemini response for chatbot."""
    if not GEMINI_API_KEY:
        return None # Fallback to mock
    
    try:
        model = genai.GenerativeModel(
            model_name=model_name,
            generation_config={"temperature": temperature}
        )
        
        full_prompt = message
        if context:
            full_prompt = f"Context from documents:\n{context}\n\nUser Question: {message}"
            
        response = model.generate_content(full_prompt)
        return response.text
    except Exception as e:
        print(f"Gemini Response Error: {e}")
        return None
