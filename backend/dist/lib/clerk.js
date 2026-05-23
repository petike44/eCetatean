import { createClerkClient, verifyToken } from '@clerk/backend';
// Lazily construct the Clerk client so a missing CLERK_SECRET_KEY
// (e.g. when running with AUTH_STUB=true) never crashes boot.
let _clerkClient = null;
function getClerkClient() {
    if (!_clerkClient) {
        _clerkClient = createClerkClient({
            secretKey: process.env.CLERK_SECRET_KEY,
        });
    }
    return _clerkClient;
}
export async function verifyClerkJWT(token) {
    try {
        const payload = await verifyToken(token, {
            secretKey: process.env.CLERK_SECRET_KEY,
        });
        return {
            sub: payload.sub,
            email: payload.email,
            role: payload.role,
            exp: payload.exp ?? 0,
            iat: payload.iat ?? 0,
        };
    }
    catch (err) {
        throw new Error('Token Clerk invalid');
    }
}
export { getClerkClient };
