import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { APP_NAV_TABS, isNavTabActive } from "@/lib/nav-config";
import { navIndicator } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/clerk-stub";
import { useProfile } from "@/lib/api-hooks";
import { profileDisplayName, profileInitials } from "@/lib/profile-utils";

interface AppHeaderProps {
  variant?: "default" | "chat";
  leftAction?: ReactNode;
  rightAction?: ReactNode;
  /** Hide nav strip on chat mobile when using merged header only */
  showNavStrip?: boolean;
}

export function AppHeader({
  variant = "default",
  leftAction,
  rightAction,
  showNavStrip = true,
}: AppHeaderProps) {
  const { location } = useRouterState();
  const path = location.pathname;
  const { user } = useUser();
  const { data: profile } = useProfile();
  const authEmail = user?.primaryEmailAddress?.emailAddress ?? null;
  const displayName = profileDisplayName(profile, authEmail);
  const initials = profileInitials(profile, authEmail);

  const isChat = variant === "chat";

  return (
    <div
      className={cn(
        "sticky top-0 z-40 shrink-0 bg-surface/95 backdrop-blur-md border-b border-border",
        "pt-[env(safe-area-inset-top)]",
      )}
    >
      {/* Top row */}
      <motion.div
        className="h-14 flex items-center gap-2 px-4"
        role="banner"
      >
        {leftAction && (
          <motion.div className="shrink-0 lg:hidden">{leftAction}</motion.div>
        )}

        {isChat ? (
          <div className="flex-1 flex items-center justify-center gap-2 min-w-0 lg:hidden">
            <h1 className="font-display font-semibold text-[15px] tracking-tight text-foreground leading-none truncate">
              ClaudIA
            </h1>
            <span className="text-[10px] font-semibold text-text-tertiary bg-surface-secondary border border-border px-1.5 py-0.5 rounded-md uppercase tracking-wider leading-none shrink-0">
              beta
            </span>
          </div>
        ) : (
          <Link
            to="/chat"
            className="font-display font-bold text-[15px] tracking-tight text-primary hover:opacity-70 transition-opacity duration-150 shrink-0"
          >
            eCetățean
          </Link>
        )}

        {/* Desktop center nav */}
        <nav
          className="hidden lg:flex flex-1 items-center justify-center gap-1"
          aria-label="Navigare principală"
        >
          {APP_NAV_TABS.map(({ to, label, icon: Icon, dot }) => {
            const active = isNavTabActive(path, to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "press flex items-center gap-2 px-3.5 py-2 rounded-xl relative transition-colors duration-150 min-h-10 text-[13px]",
                  active
                    ? "text-primary font-medium"
                    : "text-text-secondary hover:bg-black/[0.04] hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                {active && (
                  <motion.span
                    layoutId="header-nav-active"
                    className={navIndicator.className}
                    transition={navIndicator.transition}
                  />
                )}
                <motion.div className="relative shrink-0 z-[1]">
                  <Icon size={16} strokeWidth={active ? 2 : 1.7} />
                  {dot && active && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-accent rounded-full" />
                  )}
                </motion.div>
                <span className="z-[1]">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex-1 lg:hidden" />

        {rightAction && (
          <div className="shrink-0 lg:hidden">{rightAction}</div>
        )}

        {!isChat && (
          <Link
            to="/profile"
            className="press lg:hidden flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 shrink-0 ml-1"
            aria-label="Profil"
          >
            <span className="text-[11px] font-semibold text-primary">{initials}</span>
          </Link>
        )}

        <Link
          to="/profile"
          className="press hidden lg:flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-black/[0.04] transition-colors shrink-0 ml-auto"
          aria-label="Profil"
        >
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-[12px] font-semibold text-primary">{initials}</span>
          </div>
          <span className="text-[13px] font-medium text-foreground max-w-[120px] truncate hidden xl:block">
            {displayName.split(" ")[0]}
          </span>
        </Link>
      </motion.div>

      {/* Mobile nav strip */}
      {showNavStrip && (
        <nav
          className="lg:hidden flex items-center gap-1 px-3 pb-2 overflow-x-auto scrollbar-hide"
          aria-label="Navigare principală"
        >
          {APP_NAV_TABS.map(({ to, label, icon: Icon }) => {
            const active = isNavTabActive(path, to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "press flex flex-col items-center justify-center gap-0.5 min-w-[4.25rem] min-h-11 px-2.5 py-1.5 rounded-2xl relative shrink-0 transition-colors duration-200",
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
                <motion.div className="relative p-0.5 z-[1]">
                  <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                </motion.div>
                <span className={cn("text-[10px] leading-none z-[1]", active ? "font-semibold" : "font-medium")}>
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
