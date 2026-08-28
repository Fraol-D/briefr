# Briefr

Vercel-only AI research app.

Browser → Next.js `/api/research` → Gemini + Tavily → JSON report.

## Quickstart

1. `cd frontend`
2. `npm install`
3. Set server-only keys in `frontend/.env.local`:

   - `GEMINI_API_KEY`
   - `TAVILY_API_KEY`

   Do not prefix these with `NEXT_PUBLIC_`.
4. `npm run dev`

Open `http://localhost:3000` and use `/app` to run research.

## API

- `POST /api/research`

Request:

```json
{
  "question": "What are the health benefits of drinking green tea?",
  "depth": "quick"
}
```

`depth` is `"quick"` (3 sub-questions) or `"deep"` (4). The UI uses `"quick"`.

## Production

Host the `frontend` Next.js app on Vercel. Set:

- `GEMINI_API_KEY`
- `TAVILY_API_KEY`

There is no Cloud Run or separate Python backend.
