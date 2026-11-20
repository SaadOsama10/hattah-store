import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BandTone = "plain" | "cream" | "deep";

/**
 * Page rhythm: each homepage section sits on a flat band —
 *  plain (page colour), cream (the warm alternate tone), or deep (always
 *  the dark palette, in both themes: data-theme="dark" scopes the dark
 *  tokens to the section). `stitch` marks where the page thread makes a
 *  cross-stitch (see ui/Thread.tsx).
 */
export function Band({
  tone = "plain",
  children,
  className,
  id,
  labelledBy,
  stitch = true,
  as: Tag = "section",
}: {
  tone?: BandTone;
  children: ReactNode;
  className?: string;
  id?: string;
  labelledBy?: string;
  stitch?: boolean | "green";
  as?: "section" | "div";
}) {
  return (
    <Tag
      id={id}
      aria-labelledby={labelledBy}
      data-theme={tone === "deep" ? "dark" : undefined}
      data-stitch={stitch === "green" ? "green" : stitch ? "" : undefined}
      className={cn(
        "relative",
        tone === "cream" && "bg-bg-secondary",
        tone === "plain" && "bg-bg-primary",
        tone === "deep" && "band-deep text-cream",
        className
      )}
    >
      {children}
    </Tag>
  );
}
