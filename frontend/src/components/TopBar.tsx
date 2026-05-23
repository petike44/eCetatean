import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

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
  const bg = variant === "funct" ? "bg-[#2E6FAD] text-white" : "bg-surface text-text-primary";
  const border = variant === "funct" ? "border-[#2E6FAD]" : "border-border";
  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 h-14 lg:sticky lg:inset-x-0 lg:top-0 ${bg} border-b ${border} flex items-center px-5`}
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
            <p className={`text-xs truncate ${variant === "funct" ? "text-white/80" : "text-text-tertiary"}`}>
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
      className="fixed top-0 left-0 right-0 z-40 h-14 lg:sticky lg:inset-x-0 lg:top-0 bg-surface border-b border-border flex items-center justify-between px-5"
      role="banner"
    >
      <Link to="/chat" className="font-display font-bold text-[18px] text-primary">
        eCetățean
      </Link>
      {right}
    </header>
  );
}
