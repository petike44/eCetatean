import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, FolderOpen, UserCircle, Newspaper, Landmark } from "lucide-react";
import { navIndicator } from "@/lib/motion";
import { cn } from "@/lib/utils";

const tabs: { to: string; label: string; icon: typeof Sparkles; dot?: boolean }[] = [
  { to: "/chat", label: "Asistent", icon: Sparkles, dot: true },
  { to: "/documents", label: "Documente", icon: FolderOpen },
  { to: "/our-goal", label: "Scop", icon: Landmark },
  { to: "/news", label: "Noutăți", icon: Newspaper },
  { to: "/profile", label: "Profil", icon: UserCircle },
];

export function BottomNav() {
  const { location } = useRouterState();
  const path = location.pathname;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 h-[4.5rem] bg-surface/95 backdrop-blur-md border-t border-border flex items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Navigare principală"
    >
      {tabs.map(({ to, label, icon: Icon, dot }) => {
        const active = path === to || (to === "/chat" && path === "/");
        return (
          <Link
            key={to}
            to={to as "/chat"}
            className={cn(
              "press flex flex-1 flex-col items-center justify-center gap-0.5 min-w-[3.75rem] min-h-11 px-1 rounded-2xl relative transition-colors duration-200",
              active ? "text-accent" : "text-text-tertiary",
            )}
            aria-label={label}
            aria-current={active ? "page" : undefined}
          >
            {active && (
              <motion.span
                layoutId={navIndicator.layoutId}
                className={navIndicator.className}
                transition={navIndicator.transition}
              />
            )}
            <div className="relative p-1.5 z-[1]">
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
              {dot && active && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full" />
              )}
            </div>
            <span className={cn("text-[11px] leading-none z-[1]", active ? "font-semibold" : "font-medium")}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
