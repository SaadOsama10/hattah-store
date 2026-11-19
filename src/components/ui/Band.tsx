import type { ReactNode } from "react";
import { KufiyaNet } from "@/components/ui/KufiyaNet";
import { cn } from "@/lib/cn";

export type BandTone = "plain" | "cream" | "pattern" | "deep";

/**
 * Page rhythm: every homepage section sits on a band of its own —
 *  plain   (page colour), cream (alternate warm tone),
 *  pattern (page colour + a faint kufiya net fading out from the centre),
 *  deep    (always the dark espresso palette with grain, in both themes:
 *           data-theme="dark" scopes the dark tokens to this section).
 */
export function Band({
  tone = "plain",
  children,
  className,
  id,
  labelledBy,
  as: Tag = "section",
}: {
  tone?: BandTone;
  children: ReactNode;
  className?: string;
  id?: string;
  labelledBy?: string;
  as?: "section" | "div";
}) {
  return (
    <Tag
      id={id}
      aria-labelledby={labelledBy}
      data-theme={tone === "deep" ? "dark" : undefined}
      className={cn(
        "relative isolate overflow-hidden",
        tone === "cream" && "bg-bg-secondary",
        tone === "pattern" && "bg-bg-primary",
        tone === "deep" && "band-deep text-cream",
        className
      )}
    >
      {tone === "pattern" && <KufiyaNet className="band-pattern pointer-events-none absolute inset-0 -z-10 text-olive" />}
      {tone === "deep" && (
        <>
          <KufiyaNet className="band-pattern pointer-events-none absolute inset-0 -z-10 text-gold-line" />
          <div aria-hidden className="band-grain pointer-events-none absolute inset-0 -z-10" />
        </>
      )}
      {children}
    </Tag>
  );
}

/** Thin rule with a small kufiya knot in the middle, between sections. */
export function SectionDivider({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("mx-auto flex max-w-7xl items-center gap-4 px-gutter", className)}>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold-line/50 rtl:bg-gradient-to-l" />
      <svg width="34" height="16" viewBox="0 0 34 16" fill="none">
        <path d="M17 1 L24 8 L17 15 L10 8 Z" stroke="var(--color-gold-line)" strokeWidth="1" />
        <path d="M17 5 L20 8 L17 11 L14 8 Z" fill="var(--color-terracotta)" />
        <path d="M2 8 H8 M26 8 H32" stroke="var(--color-gold-line)" strokeWidth="1" strokeLinecap="round" />
      </svg>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold-line/50 rtl:bg-gradient-to-r" />
    </div>
  );
}
