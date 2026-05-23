import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { DesktopSidebar } from "./DesktopSidebar";

interface AppShellProps {
  children: ReactNode;
  hideNav?: boolean;
  topBar?: ReactNode;
  className?: string;
  /** When false, the desktop content column won't scroll — the page manages its own scroll. Default true. */
  desktopScrollable?: boolean;
}

export function AppShell({ children, hideNav, topBar, className = "", desktopScrollable = true }: AppShellProps) {
  const desktopScroll = desktopScrollable ? "lg:overflow-y-auto" : "lg:overflow-hidden";
  return (
    <div className="min-h-dvh bg-bg lg:flex">
      <DesktopSidebar />
      <div className={`lg:flex-1 lg:flex lg:flex-col ${desktopScroll} lg:h-dvh min-w-0`}>
        {topBar}
        <main
          className={`mx-auto w-full max-w-[440px] md:max-w-[640px] lg:max-w-none lg:px-0
            ${topBar ? "pt-14 lg:pt-0" : ""}
            ${hideNav ? "pb-0" : "pb-24 lg:pb-0"}
            ${className}`}
        >
          {children}
        </main>
        {!hideNav && <BottomNav />}
      </div>
    </div>
  );
}
