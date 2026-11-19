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
        "inline-flex items-center gap-2 rounded-full bg-terracotta-wash px-3.5 py-1.5 font-inter text-xs font-semibold uppercase tracking-[0.16em] text-terracotta",
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-terracotta" />
      {children}
    </span>
  );
}
