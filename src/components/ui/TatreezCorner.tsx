import { cn } from "@/lib/cn";

/**
 * A small stitched-corner accent for cards — a quiet Palestinian tatreez
 * flourish (the same cross-stitch motif as TatreezDivider) folded into a
 * card corner instead of a horizontal rule. Used sparingly.
 */
export function TatreezCorner({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 40 40" className={cn("h-9 w-9", className)}>
      <path d="M40 0 V13 C 29 13, 27 0, 27 0 Z" fill="var(--color-terracotta)" opacity="0.16" />
      {[7, 15, 23].map((d, i) => (
        <path
          key={d}
          d={`M${40 - d} 4 L${40 - d + 4} 8 L${40 - d} 12`}
          stroke={i % 2 === 0 ? "var(--color-olive)" : "var(--color-terracotta)"}
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.85"
        />
      ))}
    </svg>
  );
}
