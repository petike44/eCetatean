import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { APP_NAV_TABS, isNavTabActive } from "@/lib/nav-config";
import { navIndicator } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/clerk-stub";
import { useProfile } from "@/lib/api-hooks";
import { profileDisplayName, profileInitials } from "@/lib/profile-utils";
import { TopBarButton } from "@/components/TopBar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

interface AppHeaderProps {
  variant?: "default" | "chat";
  leftAction?: ReactNode;
  rightAction?: ReactNode;
  /** Hide nav strip on chat mobile when using merged header only */
  showNavStrip?: boolean;
}

function MobileNavMenu() {
  const [open, setOpen] = useState(false);
  const { location } = useRouterState();
  const path = location.pathname;

  return (
    <>
      <TopBarButton
        type="button"
        aria-label="Deschide meniul"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="lg:hidden shrink-0"
      >
        <Menu size={18} strokeWidth={2} />
      </TopBarButton>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-[min(300px,85vw)] p-0 flex flex-col gap-0 border-r"
        >
          <SheetTitle className="sr-only">Navigare principală</SheetTitle>
          <div className="h-14 flex items-center px-4 border-b border-border shrink-0 pt-[env(safe-area-inset-top)]">
            <span className="font-display font-bold text-[15px] text-primary">eCetățean</span>
          </div>
          <nav className="flex flex-col gap-0.5 p-2 pb-[env(safe-area-inset-bottom)]" aria-label="Navigare principală">
            {APP_NAV_TABS.map(({ to, label, icon: Icon, dot }) => {
              const active = isNavTabActive(path, to);
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "press flex items-center gap-3 px-3 py-3 rounded-xl min-h-11 transition-colors",
                    active
                      ? "bg-primary/8 text-primary font-medium"
                      : "text-text-secondary hover:bg-black/[0.04]",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <div className="relative shrink-0">
                    <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                    {dot && active && (
                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-accent rounded-full" />
                    )}
                  </div>
                  <span className="text-[15px]">{label}</span>
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
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
  const initials = profileInitials(profile?.full_name, authEmail);

  const isChat = variant === "chat";

  return (
    <div
      className={cn(
        "sticky top-0 z-40 shrink-0 bg-surface/95 backdrop-blur-md",
        !isChat && "border-b border-border",
        "pt-[env(safe-area-inset-top)]",
      )}
    >
      {/* Top row */}
      <motion.div
        className="h-14 flex items-center gap-2 px-4"
        role="banner"
      >
        {leftAction && (
          <div className="shrink-0 lg:hidden">{leftAction}</div>
        )}

        {showNavStrip && <MobileNavMenu />}

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
            className="lg:hidden font-display font-bold text-[15px] tracking-tight text-primary hover:opacity-70 transition-opacity duration-150 shrink-0"
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
    </div>
  );
}
