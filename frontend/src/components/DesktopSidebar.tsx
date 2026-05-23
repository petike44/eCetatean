import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, FolderOpen, UserCircle, Newspaper } from "lucide-react";
import { navIndicator } from "@/lib/motion";
import { cn } from "@/lib/utils";

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
    <aside className="hidden lg:flex lg:flex-col lg:w-[260px] lg:shrink-0 sticky top-0 h-dvh bg-background/95 border-r border-primary/20">
      {/* Logo row — must be h-14 to align with the content TopBar */}
      <div className="h-14 flex items-center px-5 border-b border-primary/20 shrink-0">
        <Link to="/chat" className="font-display font-bold text-[18px] tracking-tight text-primary hover:opacity-75 transition-opacity duration-200">
          eCetățean
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto" aria-label="Navigare principală">
        {tabs.map(({ to, label, icon: Icon, dot }) => {
          const active = path === to || (to === "/chat" && path === "/");
          return (
            <Link
              key={to}
              to={to as "/chat"}
              className={cn(
                "press flex items-center gap-3 px-3 py-2.5 rounded-xl relative transition-colors duration-200 min-h-11",
                active ? "text-accent font-medium" : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary",
              )}
              aria-current={active ? "page" : undefined}
            >
              {active && (
                <motion.span
                  layoutId={navIndicator.layoutId}
                  className={navIndicator.className}
                  transition={navIndicator.transition}
                />
              )}
              <div className="relative shrink-0 z-[1]">
                <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                {dot && (
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 bg-accent rounded-full anim-pulse-dot" />
                )}
              </div>
              <span className="text-[15px] z-[1]">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-primary/20">
        <Link
          to="/profile"
          className="press flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-surface-secondary transition-colors duration-200 min-h-11"
        >
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <UserCircle size={18} className="text-primary" />
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
