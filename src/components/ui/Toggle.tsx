"use client";

import { cn } from "@/lib/cn";

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-cream/20 bg-bg-secondary px-4 py-3.5 text-start transition-colors hover:border-cream/30"
    >
      <span>
        <span className="block font-inter text-sm text-cream">{label}</span>
        {description && (
          <span className="mt-0.5 block font-inter text-xs text-cream-secondary/60">
            {description}
          </span>
        )}
      </span>
      <span
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300",
          checked ? "bg-terracotta" : "bg-cream/15"
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-bg-primary shadow-sm transition-all duration-300",
            checked ? "start-6" : "start-1"
          )}
        />
      </span>
    </button>
  );
}
