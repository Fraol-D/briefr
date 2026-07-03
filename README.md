# AI Research Agent

Backend Phase 1 only.

## Backend Quickstart

1. `cd backend`
2. Install dependencies: `pip install -r requirements.txt`
3. Set `GEMINI_API_KEY` and `TAVILY_API_KEY` in `backend/.env`
4. Run: `python -m uvicorn main:app --reload`

## API

- `GET /health`
- `POST /research`
