import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-terracotta/25 bg-terracotta/10 px-4 py-1.5 font-inter text-[11px] font-semibold uppercase tracking-[0.25em] text-terracotta",
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-terracotta" />
      {children}
    </span>
  );
}
