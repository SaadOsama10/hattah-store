/* Shared brand drawings: the self-drawing kufiya net (hero, About header),
   the ornament ring around the logo, and the round kufiya seal. */

/* ── Kufiya fishnet, generated once at module load ──
   Diagonal lines (both directions) across a 1600×1000 field. Each line is
   split at the point nearest the logo, and both halves are drawn outward
   (pathLength=1 + stroke-dashoffset), delayed by their distance from the
   centre — so the net draws itself from the middle to the edges. */
const W = 1600;
const H = 1000;
const CX = 800;
const CY = 430;
const STEP = 58;
type Seg = { d: string; delay: number };
function buildNet(): Seg[] {
  const segs: Seg[] = [];
  const maxDist = Math.hypot(W, H) / 2;
  for (const dir of [1, -1]) {
    // lines: y = dir * x + c
    for (let c = -W; c <= W + H; c += STEP) {
      const pts: [number, number][] = [];
      // intersections with the 4 box edges
      for (const x of [0, W]) {
        const y = dir * x + c;
        if (y >= 0 && y <= H) pts.push([x, y]);
      }
      for (const y of [0, H]) {
        const x = (y - c) / dir;
        if (x >= 0 && x <= W) pts.push([x, y]);
      }
      if (pts.length < 2) continue;
      const [a, b] = [pts[0], pts[pts.length - 1]];
      // foot of the perpendicular from the centre onto the line, clamped to the segment
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len2 = dx * dx + dy * dy;
      if (len2 < 1) continue;
      const tt = Math.min(1, Math.max(0, ((CX - a[0]) * dx + (CY - a[1]) * dy) / len2));
      const f: [number, number] = [a[0] + tt * dx, a[1] + tt * dy];
      const dist = Math.hypot(f[0] - CX, f[1] - CY);
      const delay = Math.round((dist / maxDist) * 900);
      const r = (n: number) => Math.round(n);
      if (tt > 0.01) segs.push({ d: `M${r(f[0])} ${r(f[1])}L${r(a[0])} ${r(a[1])}`, delay });
      if (tt < 0.99) segs.push({ d: `M${r(f[0])} ${r(f[1])}L${r(b[0])} ${r(b[1])}`, delay });
    }
  }
  return segs;
}
const NET = buildNet();

/** Ornament ring around the logo: tiny diamonds + a dashed circle, with one
 * small green and one small red arc (the only flag-colour touches). */
export function LogoRing() {
  const diamonds = Array.from({ length: 24 }, (_, i) => i * 15);
  return (
    <svg viewBox="0 0 200 200" className="bh-ring" aria-hidden>
      <circle cx="100" cy="100" r="92" fill="none" stroke="var(--bh-line)" strokeWidth="0.6" strokeDasharray="1.5 4" />
      <circle cx="100" cy="100" r="84" fill="none" stroke="var(--bh-line)" strokeWidth="0.4" opacity="0.6" />
      {diamonds.map((deg) => (
        <path key={deg} d="M100 4 L102.2 7.5 L100 11 L97.8 7.5 Z" fill="var(--bh-line)" transform={`rotate(${deg} 100 100)`} opacity={deg % 45 === 0 ? 1 : 0.55} />
      ))}
      <path d="M 30 62 A 80 80 0 0 1 48 40" fill="none" stroke="var(--bh-green)" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M 170 138 A 80 80 0 0 1 152 160" fill="none" stroke="var(--bh-red)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}


/** The kufiya net layer: draws itself from the centre outward (CSS in globals.css, .bh-net). */
export function KufiyaNetDraw({ className = "bh-layer bh-net" }: { className?: string }) {
  return (
    <svg className={className} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <g className="bh-net-g">
        {NET.map((s, i) => (
          <path key={i} d={s.d} pathLength={1} style={{ animationDelay: `${300 + s.delay}ms` }} />
        ))}
      </g>
    </svg>
  );
}

/** Small round seal: kufiya net inside, "HATTAH · حَطّة" around the rim,
 * one green and one red arc. Rotates slowly (stops for reduced motion). */
export function Seal({ className, id = "seal" }: { className?: string; id?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <defs>
        <clipPath id={`${id}-clip`}>
          <circle cx="100" cy="100" r="62" />
        </clipPath>
        <pattern id={`${id}-net`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0 H14 M0 0 V14" stroke="var(--color-gold-line)" strokeWidth="0.8" />
        </pattern>
        <path id={`${id}-text`} d="M100 100 m-80 0 a80 80 0 1 1 160 0 a80 80 0 1 1 -160 0" />
      </defs>
      <circle cx="100" cy="100" r="96" fill="none" stroke="var(--color-gold-line)" strokeWidth="1" />
      <circle cx="100" cy="100" r="66" fill="none" stroke="var(--color-gold-line)" strokeWidth="0.8" />
      <rect x="30" y="30" width="140" height="140" fill={`url(#${id}-net)`} clipPath={`url(#${id}-clip)`} opacity="0.7" />
      <text fontSize="13" letterSpacing="5" fill="var(--color-gold)" fontFamily="var(--font-brand), Georgia, serif" fontWeight="700">
        <textPath href={`#${id}-text`}>HATTAH · حَطّة · HATTAH · حَطّة · HATTAH · حَطّة ·</textPath>
      </text>
      <path d="M 28 72 A 76 76 0 0 1 52 40" fill="none" stroke="var(--color-forest)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M 172 128 A 76 76 0 0 1 148 160" fill="none" stroke="var(--color-terracotta-deep)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

