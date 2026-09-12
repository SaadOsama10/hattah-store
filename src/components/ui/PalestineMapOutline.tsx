import type { SVGProps } from "react";

/**
 * A simplified, stylized line-art silhouette — a quiet decorative accent,
 * not a cartographic reference. Used sparingly (hero corner / footer).
 */
export function PalestineMapOutline(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 180 360"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
      strokeLinecap="round"
      {...props}
    >
      <path
        d="M78 8
           C 60 22, 54 42, 58 66
           C 44 92, 40 118, 50 142
           C 40 168, 36 196, 46 222
           C 40 250, 44 276, 60 296
           C 66 316, 78 336, 94 352
           C 104 330, 110 306, 108 282
           C 122 262, 128 238, 120 214
           C 132 192, 134 168, 122 146
           C 132 122, 130 96, 114 76
           C 118 54, 110 32, 92 16
           C 87 11, 82 9, 78 8 Z"
      />
      <path d="M58 66 L 114 76" strokeDasharray="1 7" opacity="0.6" />
      <path d="M50 142 L 122 146" strokeDasharray="1 7" opacity="0.6" />
    </svg>
  );
}
