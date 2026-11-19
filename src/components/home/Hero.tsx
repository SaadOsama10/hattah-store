import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowDown, MessageCircle } from "lucide-react";
import { buildWhatsAppOrderLink } from "@/lib/whatsapp";
import { HeroFx, HeroPhrases, HERO_SEEN_SCRIPT } from "@/components/home/HeroFx";

/** Arabic diacritics (harakat, tanween, shadda, sukun, dagger alef) — the
 * headline is always rendered without them. */
const stripTashkeel = (s: string) => s.replace(/[ً-ٰٟۖ-ۭ]/g, "");

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
function LogoRing() {
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

/**
 * Brand hero — no products: the logo, the kufiya, warm light and words.
 * Everything visible is server-rendered HTML/SVG/CSS (the headline is the
 * LCP element and paints with the HTML); the canvas particles, parallax,
 * phrase rotation and pause button are a small client add-on (HeroFx)
 * started after load. Entry sequence ≈3.2 s, once per session
 * (sessionStorage); prefers-reduced-motion shows the final state.
 */
export async function Hero() {
  const t = await getTranslations("hero");
  const tHome = await getTranslations("home");
  const words = stripTashkeel(t("title")).split(/\s+/);
  const phrases = t.raw("phrases") as string[];
  const letters = "HATTAH".split("");
  const whatsappHref = buildWhatsAppOrderLink(tHome("whatsappGreeting"));

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: HERO_SEEN_SCRIPT }} />
      <section id="brand-hero" className="bh" aria-labelledby="bh-title">
        {/* 1. glow */}
        <div className="bh-layer bh-glow-wrap bh-e" aria-hidden>
          <div className="bh-glow" />
        </div>
        {/* 3. light rays (behind the net so the net reads on top) */}
        <div className="bh-layer bh-rays-wrap" aria-hidden>
          <div className="bh-rays" />
        </div>
        {/* 2. kufiya net */}
        <svg className="bh-layer bh-net" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
          <g className="bh-net-g">
            {NET.map((s, i) => (
              <path key={i} d={s.d} pathLength={1} style={{ animationDelay: `${300 + s.delay}ms` }} />
            ))}
          </g>
        </svg>
        {/* 4. particles (client canvas), 5. grain, 6. vignette */}
        <HeroFx
          labels={{ pause: t("pause"), play: t("play") }}
        />
        <div className="bh-layer bh-grain" aria-hidden />
        <div className="bh-layer bh-vignette" aria-hidden />

        <div className="bh-content">
          <p className="bh-badge bh-e">
            <span aria-hidden className="bh-badge-line" />
            {t("badge")}
            <span aria-hidden className="bh-badge-line" />
          </p>

          <div className="bh-logo-wrap bh-e">
            <div className="bh-halo" aria-hidden />
            <LogoRing />
            {/* Official round logo — shown exactly as supplied (a 400 px resize of
                public/images/hattah-logo.jpg for sharp rendering), never altered. */}
            <Image
              src="/images/hattah-logo-400.webp"
              alt="HATTAH — حَطّة"
              width={180}
              height={180}
              priority
              className="bh-logo"
            />
          </div>

          <p className="bh-word" dir="ltr" aria-label="HATTAH">
            <span aria-hidden className="bh-letters">
              {letters.map((l, i) => (
                <span key={i} className="bh-letter bh-e" style={{ animationDelay: `${1400 + i * 80}ms` }}>
                  {l}
                </span>
              ))}
            </span>
            <span aria-hidden className="bh-word-shine bh-e">
              HATTAH
            </span>
          </p>

          <h1 id="bh-title" className="bh-title font-playfair">
            {words.map((w, i) => (
              <span key={i}>
                <span className="bh-wordin bh-e" style={{ animationDelay: `${1900 + i * 120}ms` }}>
                  {w}
                </span>
                {i < words.length - 1 && " "}
              </span>
            ))}
          </h1>

          <HeroPhrases phrases={phrases} labelFor={phrases.map((_, i) => t("phrase", { n: i + 1, total: phrases.length }))} />

          <div className="bh-ctas bh-e">
            <a href="#collection" className="bh-btn bh-btn-primary">
              <span>{t("ctaPrimary")}</span>
              <ArrowDown size={18} aria-hidden />
            </a>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="bh-btn bh-btn-ghost">
              <MessageCircle size={18} aria-hidden />
              <span>{t("ctaSecondary")}</span>
            </a>
          </div>
        </div>

        <a href="#collection" className="bh-scroll bh-e" aria-label={t("scroll")}>
          <span className="bh-scroll-line">
            <span className="bh-scroll-dot" />
          </span>
        </a>
      </section>
    </>
  );
}
