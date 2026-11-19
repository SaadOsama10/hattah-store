import { cn } from "@/lib/cn";

/**
 * HATTAH's own ornamental divider, drawn from three kufiya motifs:
 * the olive-leaf run (the wavy leaf band), the fishnet (the woven
 * diamond net) and the bold stitched line — re-drawn as a single
 * light stitch line in olive with terracotta accents. Purely
 * decorative (aria-hidden); colors follow the theme tokens.
 */
export function KufiyaDivider({
  className,
  align = "center",
  size = "md",
}: {
  className?: string;
  align?: "center" | "start";
  size?: "sm" | "md";
}) {
  const w = size === "sm" ? 150 : 200;
  // Leaves on each side of the net: alternate above/below the stitch line.
  const leafXs = [16, 30, 44, 58];
  return (
    <div
      aria-hidden
      className={cn("flex", align === "center" ? "justify-center" : "justify-start rtl:justify-start", className)}
    >
      <svg width={w} height={w * 0.09} viewBox="0 0 200 18" fill="none" className="overflow-visible">
        <g strokeLinecap="round" strokeLinejoin="round">
          {[0, 1].map((side) => (
            <g key={side} transform={side === 1 ? "translate(200 0) scale(-1 1)" : undefined}>
              {/* running stitch */}
              <path d="M4 9 H70" stroke="var(--color-olive)" strokeWidth="1.1" strokeDasharray="5 3" opacity="0.75" />
              {/* olive leaves */}
              {leafXs.map((x, i) => (
                <path
                  key={x}
                  d={`M${x} 9 q3 ${i % 2 ? 5 : -5} 8 ${i % 2 ? 4 : -4} q-4 ${i % 2 ? -3 : 3} -8 ${i % 2 ? -4 : 4}`}
                  fill="var(--color-olive)"
                  opacity="0.85"
                />
              ))}
              {/* cross-stitch end */}
              <path d="M0.5 6.5 L5.5 11.5 M5.5 6.5 L0.5 11.5" stroke="var(--color-terracotta)" strokeWidth="1.2" />
            </g>
          ))}
          {/* fishnet: woven diamonds with a filled terracotta heart */}
          <path
            d="M76 9 L82 3 L88 9 L82 15 Z M88 9 L94 3 L100 9 L94 15 Z M100 9 L106 3 L112 9 L106 15 Z M112 9 L118 3 L124 9 L118 15 Z"
            stroke="var(--color-olive)"
            strokeWidth="1.1"
          />
          <path d="M82 3 L118 3 M82 15 L118 15" stroke="var(--color-olive)" strokeWidth="0.8" opacity="0.5" />
          <path d="M100 5 L104 9 L100 13 L96 9 Z" fill="var(--color-terracotta)" />
        </g>
      </svg>
    </div>
  );
}
