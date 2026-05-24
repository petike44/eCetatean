import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ChatHistorySidebar, ChatHistoryMobileSheet } from "./ChatHistorySidebar";
import { AppHeader } from "./AppHeader";
import { ChatSessionsProvider } from "./ChatSessionsContext";
import { pageTransition } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  hideNav?: boolean;
  /** @deprecated Use AppHeader variant instead */
  topBar?: ReactNode;
  headerVariant?: "default" | "chat";
  headerLeftAction?: ReactNode;
  headerRightAction?: ReactNode;
  className?: string;
  contentClassName?: string;
  desktopScrollable?: boolean;
}

export function AppShell({
  children,
  hideNav,
  topBar,
  headerVariant = "default",
  headerLeftAction,
  headerRightAction,
  className = "",
  contentClassName = "",
  desktopScrollable = true,
}: AppShellProps) {
  const { location } = useRouterState();
  const desktopScroll = desktopScrollable ? "lg:overflow-y-auto" : "lg:overflow-hidden";
  const isChat = headerVariant === "chat";

  return (
    <ChatSessionsProvider>
      <div className="min-h-dvh bg-bg shell-desktop-bg lg:flex">
        {!hideNav && <ChatHistorySidebar />}
        <div className={cn("lg:flex-1 lg:flex lg:flex-col min-w-0", desktopScroll, "lg:h-dvh")}>
          {!hideNav && (
            <AppHeader
              variant={headerVariant}
              leftAction={headerLeftAction}
              rightAction={headerRightAction}
            />
          )}

          {/* Desktop-only page title bar (e.g. ClaudIA on chat) */}
          {topBar && (
            <div className={cn(isChat ? "hidden lg:block" : "")}>{topBar}</div>
          )}

          <AnimatePresence mode="wait">
            <motion.main
              key={location.pathname}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageTransition}
              className={cn(
                "mx-auto w-full max-w-[440px] md:max-w-[640px] lg:max-w-none lg:px-8 lg:py-6",
                hideNav ? "pb-0" : "pb-4 lg:pb-0",
                className,
                contentClassName,
              )}
            >
              {children}
            </motion.main>
          </AnimatePresence>
        </div>
        {!hideNav && <ChatHistoryMobileSheet />}
      </div>
    </ChatSessionsProvider>
  );
}
