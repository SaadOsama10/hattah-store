/** A tiled kufiya "fishnet" texture (thin diagonal lattice with a dot at
 * every crossing), drawn in currentColor — use with a text-* color and a
 * low opacity as a quiet background. HATTAH's own drawing. */
export function KufiyaNet({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className} width="100%" height="100%">
      <defs>
        <pattern id="hattah-kufiya-net" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M0 14 L14 0 L28 14 L14 28 Z" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="14" cy="0" r="1.6" fill="currentColor" />
          <circle cx="14" cy="28" r="1.6" fill="currentColor" />
          <circle cx="0" cy="14" r="1.6" fill="currentColor" />
          <circle cx="28" cy="14" r="1.6" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hattah-kufiya-net)" />
    </svg>
  );
}
