import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const BASE =
  "fixed top-0 left-0 right-0 z-40 h-14 lg:sticky lg:inset-x-0 lg:top-0 border-b border-primary/20 flex items-center px-5 backdrop-blur-sm bg-background/95";

interface TopBarProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  right?: ReactNode;
  left?: ReactNode;
  variant?: "default" | "funct";
}

export function TopBar({
  title,
  subtitle,
  showBack,
  right,
  left,
  variant = "default",
}: TopBarProps) {
  const router = useRouter();
  const isFunct = variant === "funct";

  return (
    <header
      className={cn(BASE, isFunct && "!bg-metro text-white !border-metro")}
      role="banner"
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {showBack && (
          <button
            onClick={() => router.history.back()}
            aria-label="Înapoi"
            className="press -ml-1.5 mr-0.5 p-2 rounded-xl hover:bg-surface-secondary transition-colors shrink-0"
          >
            <ArrowLeft size={20} strokeWidth={2.2} />
          </button>
        )}
        {left}
        <div className="min-w-0 flex-1">
          {title && (
            <h1
              className={cn(
                "font-display font-semibold text-[16px] tracking-tight leading-none truncate",
                isFunct ? "text-white" : "text-foreground",
              )}
            >
              {title}
            </h1>
          )}
          {subtitle && (
            <p
              className={cn(
                "text-[11.5px] leading-tight truncate mt-0.5",
                isFunct ? "text-white/70" : "text-text-tertiary",
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {right && (
        <div className="flex items-center gap-1 ml-3 shrink-0">{right}</div>
      )}
    </header>
  );
}

/**
 * Brand-first header: shows the "eCetățean" wordmark on mobile.
 * On desktop the sidebar already carries the brand — only the right slot renders.
 */
export function HomeTopBar({ right }: { right?: ReactNode }) {
  return (
    <header className={BASE} role="banner">
      <Link
        to="/chat"
        className="lg:hidden font-display font-bold text-[18px] tracking-tight text-primary flex-1 min-w-0 truncate"
      >
        eCetățean
      </Link>
      {/* Desktop: sidebar owns the brand — spacer keeps right slot flush-right */}
      <div className="hidden lg:flex flex-1" />
      {right && (
        <div className="flex items-center gap-1 ml-3 shrink-0">{right}</div>
      )}
    </header>
  );
}
