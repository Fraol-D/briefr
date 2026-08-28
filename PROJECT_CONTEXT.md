# PROJECT_CONTEXT.md

This file captures the high level requirements for the AI Research Agent project.

Key architecture:

- Next.js app on Vercel (UI + `/api/research`).
- Gemini for decompose and synthesize.
- Tavily Search for web results.
- Three step agent flow: decompose, research, synthesize.
- Server-only secrets: `GEMINI_API_KEY`, `TAVILY_API_KEY`.
