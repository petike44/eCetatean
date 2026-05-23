import { Link, useRouterState } from "@tanstack/react-router";
import { Sparkles, FolderOpen, UserCircle, Newspaper } from "lucide-react";

const tabs: { to: string; label: string; icon: typeof Sparkles; dot?: boolean }[] = [
  { to: "/chat", label: "Asistent", icon: Sparkles, dot: true },
  { to: "/documents", label: "Documente", icon: FolderOpen },
  { to: "/news", label: "Noutăți", icon: Newspaper },
  { to: "/profile", label: "Profil", icon: UserCircle },
];

export function BottomNav() {
  const { location } = useRouterState();
  const path = location.pathname;
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-surface border-t border-border flex items-center justify-around px-2"
      aria-label="Navigare principală"
    >
      {tabs.map(({ to, label, icon: Icon, dot }) => {
        const active = path === to || (to === "/chat" && path === "/");
        return (
          <Link
            key={to}
            to={to as "/chat"}
            className={`press flex flex-col items-center gap-1 px-3 py-2 rounded-xl relative ${
              active ? "text-accent" : "text-text-tertiary"
            }`}
            aria-label={label}
            aria-current={active ? "page" : undefined}
          >
            <div className="relative">
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
              {dot && (
                <span className="absolute -top-0.5 -right-1 w-2 h-2 bg-accent rounded-full anim-pulse-dot" />
              )}
            </div>
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
