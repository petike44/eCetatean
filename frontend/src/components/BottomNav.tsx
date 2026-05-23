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
      className="fixed bottom-0 left-0 right-0 z-40 h-[4.25rem] bg-surface/95 backdrop-blur-md border-t border-border flex items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Navigare principală"
    >
      {tabs.map(({ to, label, icon: Icon, dot }) => {
        const active = path === to || (to === "/chat" && path === "/");
        return (
          <Link
            key={to}
            to={to as "/chat"}
            className={`press flex flex-col items-center justify-center gap-0.5 min-w-[4rem] min-h-11 px-2 rounded-2xl relative transition-colors ${
              active ? "text-primary" : "text-text-tertiary"
            }`}
            aria-label={label}
            aria-current={active ? "page" : undefined}
          >
            <div className={`relative p-1 rounded-xl ${active ? "bg-primary-light" : ""}`}>
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
              {dot && active && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full" />
              )}
            </div>
            <span className={`text-[11px] leading-none ${active ? "font-semibold" : "font-medium"}`}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
