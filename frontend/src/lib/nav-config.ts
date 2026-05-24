import type React from "react";
import { Home, Sparkles, FolderOpen, UserCircle, Newspaper, ClipboardList } from "lucide-react";

export const APP_NAV_TABS: readonly { to: string; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; dot?: boolean }[] = [
  { to: "/home", label: "Acasă", icon: Home },
  { to: "/chat", label: "Asistent", icon: Sparkles, dot: true },
  { to: "/documents", label: "Documente", icon: FolderOpen },
  { to: "/plans", label: "Planuri", icon: ClipboardList },
  { to: "/news", label: "Noutăți", icon: Newspaper },
  { to: "/profile", label: "Profil", icon: UserCircle },
];

export type AppNavTab = (typeof APP_NAV_TABS)[number];

export function isNavTabActive(path: string, to: string): boolean {
  if (to === "/home") {
    return path === "/home" || path === "/";
  }
  return path === to || path.startsWith(`${to}/`);
}
