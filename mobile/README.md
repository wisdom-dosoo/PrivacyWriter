# 📱 PrivacyWriter Mobile MVP

A lightweight, privacy-focused mobile writing assistant.

## 🚀 Quick Start

### 1. Backend Setup (Python)
Navigate to the backend folder:
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```
The API will start at `http://localhost:8000`.

### 2. Frontend Setup
Simply open `frontend/index.html` in your mobile browser or desktop browser (simulating mobile).

---

## 🛠️ Architecture

### Frontend (Client)
- **HTML5 & Tailwind CSS:** Responsive, mobile-first UI.
- **JavaScript (ES6):** Handles API communication and UI state.
- **No Build Step:** Uses CDN for Tailwind for rapid MVP deployment.

### Backend (Server)
- **FastAPI:** Handles AI processing requests.
- **Stateless:** No database, no logs of user text.
- **AI Integration:** Currently mocked for MVP. Connect to Gemini API or local LLM in `main.py`.

## 📱 Features

1.  **Grammar Check**: Fixes syntax and spelling.
2.  **Rewrite**: Changes tone (Professional, Casual, Concise).
3.  **Summarize**: Creates bulleted summaries.
4.  **Translate**: Supports ES, FR, DE, JP.

## 🔒 Privacy Note

Unlike the Chrome Extension which uses on-device Chrome AI, this mobile version requires a server.
To maintain privacy:
1.  The server is stateless.
2.  No text is saved to disk.
3.  SSL/TLS should be used in production.