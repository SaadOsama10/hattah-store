import type { SVGProps } from "react";

/** Thin line-art olive branch — a small, quiet decorative accent. */
export function OliveBranch(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 220 60"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 30 C 60 22, 140 40, 216 18" />
      {[
        { x: 28, y: 27, r: -18 },
        { x: 54, y: 24, r: 14 },
        { x: 82, y: 30, r: -12 },
        { x: 110, y: 34, r: 18 },
        { x: 138, y: 28, r: -16 },
        { x: 166, y: 24, r: 12 },
        { x: 190, y: 20, r: -14 },
      ].map((leaf, i) => (
        <ellipse
          key={i}
          cx={leaf.x}
          cy={leaf.y}
          rx="9"
          ry="4"
          transform={`rotate(${leaf.r} ${leaf.x} ${leaf.y})`}
        />
      ))}
      <circle cx="206" cy="14" r="3.2" fill="currentColor" stroke="none" opacity="0.85" />
      <circle cx="198" cy="24" r="2.6" fill="currentColor" stroke="none" opacity="0.7" />
    </svg>
  );
}
