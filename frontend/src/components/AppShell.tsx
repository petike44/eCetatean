import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { BottomNav } from "./BottomNav";
import { DesktopSidebar } from "./DesktopSidebar";
import { pageTransition } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  hideNav?: boolean;
  topBar?: ReactNode;
  className?: string;
  contentClassName?: string;
  /** When false, the desktop content column won't scroll — the page manages its own scroll. Default true. */
  desktopScrollable?: boolean;
}

export function AppShell({
  children,
  hideNav,
  topBar,
  className = "",
  contentClassName = "",
  desktopScrollable = true,
}: AppShellProps) {
  const { location } = useRouterState();
  const desktopScroll = desktopScrollable ? "lg:overflow-y-auto" : "lg:overflow-hidden";

  return (
    <div className="min-h-dvh bg-bg shell-desktop-bg lg:flex">
      <DesktopSidebar />
      <div className={cn("lg:flex-1 lg:flex lg:flex-col min-w-0", desktopScroll, "lg:h-dvh")}>
        {topBar}
        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageTransition}
            className={cn(
              "mx-auto w-full max-w-[440px] md:max-w-[640px] lg:max-w-none lg:px-8 lg:py-6",
              topBar ? "pt-14 lg:pt-0" : "",
              hideNav ? "pb-0" : "pb-24 lg:pb-0",
              className,
              contentClassName,
            )}
          >
            {children}
          </motion.main>
        </AnimatePresence>
        {!hideNav && <BottomNav />}
      </div>
    </div>
  );
}
