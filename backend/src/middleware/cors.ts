import { cors } from 'hono/cors'

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'

// Allow both the configured URL and common local dev ports so the
// app works regardless of which port the Vite/TanStack dev server picks.
const allowedOrigins = Array.from(
  new Set([
    frontendUrl,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
  ])
)

export const corsMiddleware = cors({
  origin: allowedOrigins,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
})
