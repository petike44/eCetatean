# eCetățean

AI-powered civic assistant for Romanian citizens. You describe a life event in plain Romanian — **ClaudIA** (the AI) figures out what you need to do, generates pre-filled official PDF forms, and tracks your progress step by step.

## What it does

- **Chat with ClaudIA** — describe a life event ("Am cumpărat o mașină din Germania", "Tocmai mi s-a născut copilul") and get a personalized action plan
- **Pre-filled PDFs** — auto-generated official forms ready to download and submit
- **Progress tracker** — step-by-step dashboard showing what's done, what's next, costs, and deadlines
- **Deadline alerts** — never miss ITP, impozit auto, or D212 again
- **Civic reports** — report issues in your city with photo upload
- **Immutable audit log** — every action is SHA-256 hash-chained for transparency

## Stack

- **Frontend:** React + Vite + TypeScript, Tailwind, shadcn/ui
- **Backend:** Hono.js on Vercel, Supabase (PostgreSQL + RLS), Google Gemini
- **Auth:** Supabase Auth with ROeID-style 2FA simulation
- **PDF:** pdfme

## Built at Cluj Hackathon 2026 — Digital Romania (48h)
