import { getTranslations } from "next-intl/server";
import { Band } from "@/components/ui/Band";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

/* Line icons drawn for this section — one stroke width (1.25) throughout. */
const ICONS = [
  // heritage: kufiya net knot
  <g key="h">
    <path d="M24 6 L42 24 L24 42 L6 24 Z" />
    <path d="M15 15 L33 33 M33 15 L15 33" />
    <path d="M24 16 L32 24 L24 32 L16 24 Z" />
  </g>,
  // craft: needle and thread
  <g key="c">
    <path d="M34 8 L12 38" />
    <ellipse cx="34.5" cy="8.5" rx="1.6" ry="3" transform="rotate(35 34.5 8.5)" />
    <path d="M12 38 C 8 32, 22 30, 18 24 S 30 18, 26 12" strokeDasharray="2.5 2.5" />
  </g>,
  // selection: faceted gem with a spark
  <g key="s">
    <path d="M10 18 L17 9 H31 L38 18 L24 40 Z" />
    <path d="M10 18 H38 M17 9 L21 18 L24 40 L27 18 L31 9" />
    <path d="M40 4 V10 M37 7 H43" />
  </g>,
  // ordering: speech bubble with dots
  <g key="w">
    <path d="M8 12 H40 V32 H22 L13 40 V32 H8 Z" />
    <path d="M17 22 h.01 M24 22 h.01 M31 22 h.01" strokeWidth="2.6" />
  </g>,
];

/** Four points about the store — values only, no figures or promises. */
export async function WhyHattah() {
  const t = await getTranslations("home");
  const items = t.raw("why") as { t: string; d: string }[];
  return (
    <Band tone="pattern" labelledBy="home-why" className="cv-auto py-section">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[34rem] w-[min(60rem,120vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse,var(--t-gold-glow),transparent_65%)] opacity-60" />
      <div className="mx-auto max-w-7xl px-gutter">
        <Reveal blur>
          <SectionHeading id="home-why" eyebrow={t("whyEyebrow")} title={t("whyTitle")} align="center" />
        </Reveal>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it, i) => (
            <Reveal
              as="li"
              key={it.t}
              delay={i * 90}
              className="group rounded-tile bg-surface/55 p-6 shadow-card ring-1 ring-line backdrop-blur-md transition-[box-shadow,transform] duration-500 ease-soft hover:-translate-y-1 hover:shadow-glow-gold"
            >
              <svg
                viewBox="0 0 48 48"
                width="44"
                height="44"
                fill="none"
                stroke="var(--color-gold-line)"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className="transition-transform duration-500 ease-soft group-hover:scale-105"
              >
                {ICONS[i % ICONS.length]}
              </svg>
              <h3 className="mt-5 font-playfair text-h3 font-bold text-cream">{it.t}</h3>
              <p className="mt-2 font-inter text-sm leading-relaxed text-cream-secondary">{it.d}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </Band>
  );
}
