import type { User } from "@supabase/supabase-js";

export const ADMIN_EMAIL = "admin@ecetatean.ro";

/** Login shortcut: admin / admin → admin@ecetatean.ro */
export function resolveLoginCredentials(email: string, password: string) {
  const trimmed = email.trim();
  if (trimmed.toLowerCase() === "admin" && password === "admin") {
    return { email: ADMIN_EMAIL, password: "admin", isAdminShortcut: true };
  }
  return { email: trimmed, password, isAdminShortcut: false };
}

export function isAdminUser(
  user:
    | User
    | null
    | undefined
    | {
        primaryEmailAddress?: { emailAddress: string } | null;
        id?: string;
      }
    | null,
): boolean {
  if (!user) return false;
  if ("email" in user && user.email) {
    if (user.email.toLowerCase() === ADMIN_EMAIL) return true;
    const meta = user.user_metadata as Record<string, unknown> | undefined;
    if (meta?.role === "admin") return true;
  }
  if ("primaryEmailAddress" in user && user.primaryEmailAddress?.emailAddress) {
    if (user.primaryEmailAddress.emailAddress.toLowerCase() === ADMIN_EMAIL) return true;
  }
  return false;
}
