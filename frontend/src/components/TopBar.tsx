import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TopBarProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  right?: ReactNode;
  left?: ReactNode;
  variant?: "default" | "funct";
}

export function TopBar({ title, subtitle, showBack, right, left, variant = "default" }: TopBarProps) {
  const router = useRouter();
  const isFunct = variant === "funct";

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-40 h-14 lg:sticky lg:inset-x-0 lg:top-0 border-b flex items-center px-5 backdrop-blur-md",
        isFunct ? "bg-metro text-white border-metro" : "bg-surface/95 text-text-primary border-border",
      )}
      role="banner"
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {showBack && (
          <button
            onClick={() => router.history.back()}
            aria-label="Înapoi"
            className="press -ml-2 p-2 rounded-xl"
          >
            <ArrowLeft size={24} />
          </button>
        )}
        {left}
        <div className="min-w-0 flex-1">
          {title && (
            <h1 className="font-display font-semibold text-[17px] leading-tight truncate">{title}</h1>
          )}
          {subtitle && (
            <p className={cn("text-xs truncate", isFunct ? "text-white/80" : "text-text-tertiary")}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </header>
  );
}

export function HomeTopBar({ right }: { right?: ReactNode }) {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 h-14 lg:sticky lg:inset-x-0 lg:top-0 bg-surface/95 backdrop-blur-md border-b border-border flex items-center justify-between px-5"
      role="banner"
    >
      <Link to="/chat" className="font-display font-bold text-[18px] text-primary hover:text-accent transition-colors duration-200">
        eCetățean
      </Link>
      {right}
    </header>
  );
}
