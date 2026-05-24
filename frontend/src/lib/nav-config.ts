import { Sparkles, FolderOpen, UserCircle, Newspaper } from "lucide-react";

export const APP_NAV_TABS = [
  { to: "/chat", label: "Asistent", icon: Sparkles, dot: true },
  { to: "/documents", label: "Documente", icon: FolderOpen },
  { to: "/news", label: "Noutăți", icon: Newspaper },
  { to: "/profile", label: "Profil", icon: UserCircle },
] as const;

export type AppNavTab = (typeof APP_NAV_TABS)[number];

export function isNavTabActive(path: string, to: string): boolean {
  if (to === "/chat") {
    return path === "/chat" || path === "/" || path.startsWith("/chat/");
  }
  return path === to || path.startsWith(`${to}/`);
}
