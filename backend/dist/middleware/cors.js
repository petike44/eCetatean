import { cors } from 'hono/cors';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
// Common local dev ports (Vite/TanStack may use 5173, 5174, or 8080)
const devOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:8080',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8080',
];
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
const allowedOrigins = isProduction
    ? [frontendUrl]
    : [...new Set([frontendUrl, ...devOrigins])];
export const corsMiddleware = cors({
    origin: allowedOrigins,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
});
