import { cn } from "@/lib/cn";

/**
 * A section divider styled after tatreez cross-stitch motifs — a quiet
 * geometric alternative to the plain line divider. Used sparingly.
 */
export function TatreezDivider({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2.5", className)} aria-hidden>
      <span className="h-px w-10 bg-gradient-to-r from-transparent to-olive/50" />
      <svg width="120" height="14" viewBox="0 0 120 14" fill="none">
        {[6, 24, 42, 78, 96, 114].map((x, i) => (
          <g key={x} opacity={0.75}>
            <path
              d={`M${x - 4} 3 L${x} 7 L${x - 4} 11 M${x + 4} 3 L${x} 7 L${x + 4} 11`}
              stroke={i % 2 === 0 ? "var(--color-olive)" : "var(--color-terracotta)"}
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </g>
        ))}
        <rect x="56" y="3" width="8" height="8" transform="rotate(45 60 7)" fill="var(--color-terracotta)" opacity="0.9" />
      </svg>
      <span className="h-px w-10 bg-gradient-to-l from-transparent to-olive/50" />
    </div>
  );
}
