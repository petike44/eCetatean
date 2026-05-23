import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

interface AppShellProps {
  children: ReactNode;
  hideNav?: boolean;
  topBar?: ReactNode;
  className?: string;
}

export function AppShell({ children, hideNav, topBar, className = "" }: AppShellProps) {
  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto max-w-[440px] md:max-w-[640px] lg:max-w-[480px] relative">
        {topBar}
        <main
          className={`${topBar ? "pt-14" : ""} ${hideNav ? "pb-0" : "pb-24"} ${className}`}
        >
          {children}
        </main>
        {!hideNav && <BottomNav />}
      </div>
    </div>
  );
}
