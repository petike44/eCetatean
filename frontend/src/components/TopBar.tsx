import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const BASE =
  "fixed top-0 left-0 right-0 z-40 h-14 lg:sticky lg:inset-x-0 lg:top-0 flex items-center px-4 pointer-events-none";

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
      className={cn(BASE, isFunct ? "bg-metro text-white" : "")}
      style={!isFunct ? { background: "linear-gradient(to bottom, var(--bg) 55%, transparent 100%)" } : undefined}
      role="banner"
    >
      <div className="flex items-center gap-1.5 flex-1 min-w-0 pointer-events-auto">
        {showBack && (
          <TopBarButton
            onClick={() => router.history.back()}
            aria-label="Înapoi"
            className="-ml-1 mr-0.5 shrink-0"
          >
            <ArrowLeft size={17} strokeWidth={2} />
          </TopBarButton>
        )}
        {left}
        <div className="min-w-0">
          {subtitle && (
            <p className={cn(
              "text-[10px] font-semibold uppercase tracking-widest leading-none mb-0.5",
              isFunct ? "text-white/60" : "text-text-tertiary",
            )}>
              {subtitle}
            </p>
          )}
          {title && (
            <h1 className={cn(
              "font-display font-semibold text-[15px] tracking-tight leading-none truncate",
              isFunct ? "text-white" : "text-foreground",
            )}>
              {title}
            </h1>
          )}
        </div>
      </div>
      {right && (
        <div className="flex items-center gap-1 ml-2 shrink-0 pointer-events-auto">{right}</div>
      )}
    </header>
  );
}

export function HomeTopBar({ right }: { right?: ReactNode }) {
  return (
    <header
      className={BASE}
      style={{ background: "linear-gradient(to bottom, var(--bg) 55%, transparent 100%)" }}
      role="banner"
    >
      <Link
        to="/home"
        className="lg:hidden font-display font-bold text-[15px] tracking-tight text-primary flex-1 min-w-0 truncate pointer-events-auto"
      >
        eCetățean
      </Link>
      <div className="hidden lg:flex flex-1" />
      {right && (
        <div className="flex items-center gap-1 ml-2 shrink-0 pointer-events-auto">{right}</div>
      )}
    </header>
  );
}

/**
 * Apple-style vibrancy button — semi-transparent circle that tints with whatever
 * is rendered behind it via the parent header's backdrop-blur.
 */
export function TopBarButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "press w-9 h-9 rounded-full flex items-center justify-center",
        "bg-black/[0.04] hover:bg-black/[0.08] active:bg-black/[0.12]",
        "transition-colors duration-150",
        className,
      )}
    />
  );
}
