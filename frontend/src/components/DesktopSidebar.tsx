import { Link, useRouterState } from "@tanstack/react-router";
import { Sparkles, FolderOpen, UserCircle, Newspaper } from "lucide-react";

const tabs: { to: string; label: string; icon: typeof Sparkles; dot?: boolean }[] = [
  { to: "/chat", label: "Asistent", icon: Sparkles, dot: true },
  { to: "/documents", label: "Documente", icon: FolderOpen },
  { to: "/news", label: "Noutăți", icon: Newspaper },
  { to: "/profile", label: "Profil", icon: UserCircle },
];

export function DesktopSidebar() {
  const { location } = useRouterState();
  const path = location.pathname;

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-[260px] lg:shrink-0 sticky top-0 h-dvh bg-surface border-r border-border">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-border">
        <Link to="/chat" className="font-display font-bold text-[20px] text-primary">
          eCetățean
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1" aria-label="Navigare principală">
        {tabs.map(({ to, label, icon: Icon, dot }) => {
          const active = path === to || (to === "/chat" && path === "/");
          return (
            <Link
              key={to}
              to={to as "/chat"}
              className={`press flex items-center gap-3 px-3 py-2.5 rounded-xl relative transition-colors ${
                active
                  ? "bg-accent/10 text-accent font-medium"
                  : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <div className="relative shrink-0">
                <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                {dot && (
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 bg-accent rounded-full anim-pulse-dot" />
                )}
              </div>
              <span className="text-[15px]">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User info at bottom */}
      <div className="px-4 py-4 border-t border-border">
        <Link
          to="/profile"
          className="press flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-surface-secondary transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
            <UserCircle size={18} className="text-accent" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-text-primary truncate">Contul meu</p>
            <p className="text-[11px] text-text-tertiary truncate">Profil și setări</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
