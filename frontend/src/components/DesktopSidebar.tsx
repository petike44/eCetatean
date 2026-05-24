import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Home, Sparkles, FolderOpen, UserCircle, Newspaper, FlaskConical } from "lucide-react";
import { navIndicator } from "@/lib/motion";
import { cn } from "@/lib/utils";

const tabs: { to: string; label: string; icon: typeof Sparkles; dot?: boolean }[] = [
  { to: "/home", label: "Acasă", icon: Home },
  { to: "/chat", label: "Asistent", icon: Sparkles, dot: true },
  { to: "/documents", label: "Documente", icon: FolderOpen },
  { to: "/news", label: "Noutăți", icon: Newspaper },
  { to: "/profile", label: "Profil", icon: UserCircle },
  { to: "/seed", label: "Seed", icon: FlaskConical },
];

export function DesktopSidebar() {
  const { location } = useRouterState();
  const path = location.pathname;

  return (
    // Same tinted band bg as TopBar; same border-b color; border-r matches
    <aside className="hidden lg:flex lg:flex-col lg:w-[240px] lg:shrink-0 sticky top-0 h-dvh bg-bg border-r border-border">
      <div className="h-14 flex items-center px-5 shrink-0">
        <Link
          to="/home"
          className="font-display font-bold text-[15px] tracking-tight text-primary hover:opacity-70 transition-opacity duration-150"
        >
          eCetățean
        </Link>
      </div>

      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto" aria-label="Navigare principală">
        {tabs.map(({ to, label, icon: Icon, dot }) => {
          const active = path === to || (to === "/home" && path === "/");
          return (
            <Link
              key={to}
              to={to as "/chat"}
              className={cn(
                "press flex items-center gap-3 px-3 py-2.5 rounded-xl relative transition-colors duration-150 min-h-10 text-[14px]",
                active
                  ? "bg-primary/8 text-primary font-medium"
                  : "text-text-secondary hover:bg-black/[0.04] hover:text-foreground",
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
                <Icon size={18} strokeWidth={active ? 2 : 1.7} />
                {dot && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-accent rounded-full" />
                )}
              </div>
              <span className="z-[1]">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-2 py-3 border-t border-border">
        <Link
          to="/profile"
          className="press flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-black/[0.04] transition-colors duration-150 min-h-10"
        >
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <UserCircle size={16} className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-foreground truncate leading-tight">Contul meu</p>
            <p className="text-[11px] text-text-tertiary truncate leading-tight">Profil și setări</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
