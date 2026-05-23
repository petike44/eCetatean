import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function PrimaryButton({ children, className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      className={cn(
        "press w-full bg-accent hover:bg-accent-dark active:bg-accent-dark text-white font-semibold text-[15px] py-4 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      className={cn(
        "press w-full bg-transparent border border-border text-text-primary font-semibold text-[15px] py-3 px-6 rounded-xl hover:bg-surface-secondary transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2",
        className,
      )}
    >
      {children}
    </button>
  );
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  validator?: (v: string) => string | null;
  hint?: string;
}

export function Field({ label, validator, hint, className = "", onChange, value, ...p }: FieldProps) {
  const [touched, setTouched] = useState(false);
  const [v, setV] = useState((value as string) ?? "");

  useEffect(() => {
    if (value !== undefined) setV(String(value));
  }, [value]);
  const err = touched && validator ? validator(v) : null;
  const valid = touched && validator && !err && v.length > 0;

  return (
    <div className="w-full">
      {label && <label className="block text-[13px] font-medium text-text-secondary mb-1.5">{label}</label>}
      <div className="relative">
        <input
          {...p}
          value={v}
          onChange={(e) => {
            setV(e.target.value);
            onChange?.(e);
          }}
          onBlur={(e) => {
            setTouched(true);
            p.onBlur?.(e);
          }}
          className={cn(
            "w-full bg-surface-secondary border text-[15px] text-text-primary placeholder:text-text-tertiary py-3.5 px-4 rounded-xl outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/30",
            err ? "border-error focus:bg-surface" : "border-transparent focus:bg-surface focus:border-primary",
            className,
          )}
        />
        {valid && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-success">
            <Check size={20} strokeWidth={3} />
          </span>
        )}
      </div>
      {err && <p className="text-xs text-error mt-1">{err}</p>}
      {!err && hint && <p className="text-xs text-text-tertiary mt-1">{hint}</p>}
    </div>
  );
}

export function Textarea({ label, className = "", ...p }: { label?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="w-full">
      {label && <label className="block text-[13px] font-medium text-text-secondary mb-1.5">{label}</label>}
      <textarea
        {...p}
        className={cn(
          "w-full bg-surface-secondary border border-transparent focus:bg-surface focus:border-primary text-[15px] text-text-primary placeholder:text-text-tertiary py-3.5 px-4 rounded-xl outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/30 resize-none",
          className,
        )}
      />
    </div>
  );
}

export function Card({
  children,
  className = "",
  accent,
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  accent?: "amber" | "green" | "red" | "gray" | "navy";
  interactive?: boolean;
}) {
  const tints: Record<string, string> = {
    amber: "bg-amber-50/60 border-amber-200/50",
    green: "bg-emerald-50/60 border-emerald-200/50",
    red: "bg-red-50/60 border-red-200/50",
    gray: "",
    navy: "",
  };
  return (
    <div
      className={cn(
        "bg-surface border border-border rounded-2xl p-5 transition-all duration-200",
        accent ? tints[accent] : "",
        interactive && "lg:hover:shadow-sm lg:hover:border-primary/20 lg:hover:-translate-y-0.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "red" | "amber" | "green" | "neutral" | "metro" }) {
  const tones = {
    red: "bg-error-light text-error",
    amber: "bg-accent-light text-accent-dark",
    green: "bg-success-light text-success",
    neutral: "bg-surface-secondary text-text-secondary",
    metro: "bg-metro-light text-metro",
  };
  return (
    <span className={cn("inline-flex items-center font-display font-bold text-[12px] px-2.5 py-1 rounded-full", tones[tone])}>
      {children}
    </span>
  );
}

export function LineBadge({ children, metro }: { children: ReactNode; metro?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-display font-bold text-[12px] min-w-[28px] h-7 px-2 rounded-lg",
        metro ? "bg-metro text-white" : "bg-accent-light text-accent-dark",
      )}
    >
      {children}
    </span>
  );
}

export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-error rounded-xl bg-error-light border border-error/20 px-4 py-3">{children}</p>
  );
}
