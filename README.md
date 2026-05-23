# eCetățean

Asistent civic AI pentru cetățenii din Cluj-Napoca: planuri de acțiune, formulare PDF pre-completate, urmărire pași și raportări civice.

## Stack

- **Frontend:** React 19, TanStack Start, Supabase Auth, Tailwind
- **Backend:** Hono, Supabase (PostgreSQL), Google Gemini (ClaudIA), pdfme (PDF)

## Setup local

### 1. Supabase

1. Creează un proiect pe [supabase.com](https://supabase.com).
2. Rulează [`backend/schema.sql`](backend/schema.sql) în SQL Editor.
3. Copiază URL, service role key, publishable key și JWT secret din Settings → API.

### 2. Backend

```bash
cd backend
cp .env.example .env.local
# Completează SUPABASE_*, SUPABASE_JWT_SECRET, GEMINI_API_KEY, FRONTEND_URL
npm install
npm run dev
```

API: `http://localhost:3001` — health: `GET /api/health` (arată `claudia: gemini` sau `stub`).

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
# VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
# VITE_API_URL= empty → Vite proxies /api to :3001 (recommended)
# Or VITE_API_URL=http://localhost:3001
npm install
npm run dev
```

**Chat not working?** Run both servers. Set `FRONTEND_URL` in `backend/.env.local` to the port Vite shows (often `http://localhost:8080`). In DevTools Network, a chat message must show **POST** `/api/claudia` with status 200.

### 4. Gemini (ClaudIA)

Obține cheie gratuită: [Google AI Studio](https://aistudio.google.com/apikey) → `GEMINI_API_KEY` în `backend/.env.local`.

Fără cheie, ClaudIA folosește răspunsuri stub pe cuvinte cheie (util pentru demo offline).

### 5. Auth stub (opțional)

În `backend/.env.local`: `AUTH_STUB=true` — ocolește JWT (doar dev, fără Supabase).

## Demo flows

1. **Înmatriculare mașină din Germania:** Chat → „Am adus o mașină din Germania” → plan → Urmărește progresul → pași cu PDF, plată simulată, programări simulate.
2. **Mutare la Cluj:** Chat → „Mă mut la Cluj pentru facultate” → formulare viza flotant, transfer medic, bursă.

Plățile și programările din app sunt **simulate** (mesaj de succes, fără integrare reală cu ghișeu.ro / DRPCIV).

## Structură

```
frontend/     UI + routes
backend/      API Hono
CLAUDE_CONTEXT.md   context istoric (parțial învechit)
```

## Deploy

- Backend: Vercel (`backend/vercel.json`) — setează env: `SUPABASE_*`, `SUPABASE_JWT_SECRET`, `GEMINI_API_KEY`, `FRONTEND_URL`
- Frontend: Cloudflare Workers (`frontend/wrangler.jsonc`) sau Vite static
