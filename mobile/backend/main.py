from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import random

# Initialize App
app = FastAPI(title="PrivacyWriter Mobile API", version="1.0.0")

# CORS Configuration (Allow Frontend access)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Data Models ---
class TextRequest(BaseModel):
    text: str
    option: Optional[str] = None  # Used for tone or language

class AIResponse(BaseModel):
    original: str
    result: str
    type: str

# --- AI Logic Placeholders ---
# NOTE: In a real production build, integrate Google Gemini API or a local model here.

def mock_ai_process(text: str, task: str, option: str = None) -> str:
    """Simulates AI processing for the MVP."""
    if task == "grammar":
        # Simulating a fix
        return text.replace("teh", "the").replace("dont", "don't") + " (Grammar Checked)"
    
    elif task == "rewrite":
        tones = {
            "professional": "Herewith, the content has been refined for professional standards.",
            "casual": "Hey, I just tweaked this to sound super chill.",
            "concise": "Text shortened."
        }
        prefix = tones.get(option, "Rewritten:")
        return f"{prefix} {text}"
    
    elif task == "summarize":
        return f"• Key point extracted from text\n• Another important detail\n• Summary of: {text[:20]}..."
    
    elif task == "translate":
        langs = {"es": "Spanish", "fr": "French", "de": "German", "jp": "Japanese"}
        lang_name = langs.get(option, option)
        return f"[{lang_name} Translation]: {text}"
    
    return text

# --- Endpoints ---

@app.get("/")
def read_root():
    return {"status": "online", "service": "PrivacyWriter Mobile API"}

@app.post("/api/grammar", response_model=AIResponse)
async def check_grammar(req: TextRequest):
    if not req.text:
        raise HTTPException(status_code=400, detail="Text is required")
    
    result = mock_ai_process(req.text, "grammar")
    return {"original": req.text, "result": result, "type": "grammar"}

@app.post("/api/rewrite", response_model=AIResponse)
async def rewrite_text(req: TextRequest):
    if not req.text:
        raise HTTPException(status_code=400, detail="Text is required")
    
    # Default to professional if no option provided
    tone = req.option or "professional"
    result = mock_ai_process(req.text, "rewrite", tone)
    return {"original": req.text, "result": result, "type": "rewrite"}

@app.post("/api/summarize", response_model=AIResponse)
async def summarize_text(req: TextRequest):
    if not req.text:
        raise HTTPException(status_code=400, detail="Text is required")
    
    if len(req.text) < 20:
        raise HTTPException(status_code=400, detail="Text too short to summarize")
        
    result = mock_ai_process(req.text, "summarize")
    return {"original": req.text, "result": result, "type": "summarize"}

@app.post("/api/translate", response_model=AIResponse)
async def translate_text(req: TextRequest):
    if not req.text:
        raise HTTPException(status_code=400, detail="Text is required")
    
    target_lang = req.option or "es"
    result = mock_ai_process(req.text, "translate", target_lang)
    return {"original": req.text, "result": result, "type": "translate"}

if __name__ == "__main__":
    import uvicorn
    # Run with: python main.py
    uvicorn.run(app, host="0.0.0.0", port=8000)