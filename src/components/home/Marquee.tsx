import { getTranslations } from "next-intl/server";

const isArabic = (w: string) => /[؀-ۿ]/.test(w);

/** Thin moving word strip under the hero (HATTAH · حَطّة · Gaza · …).
 * Scrolls toward the reading direction's end (left in LTR, right in RTL),
 * pauses on hover, static under reduced motion. Decorative. */
export async function Marquee() {
  const t = await getTranslations("hero");
  const words = t.raw("marquee") as string[];
  const run = Array.from({ length: 4 }, () => words).flat();
  const Row = () => (
    <div className="flex shrink-0 items-center">
      {run.map((w, i) => (
        <span key={i} className="flex items-center">
          <span
            className="px-7 text-xl font-bold uppercase text-cream-secondary sm:px-9 sm:text-2xl"
            style={{ fontFamily: isArabic(w) ? "var(--font-display-current), serif" : "var(--font-brand), Georgia, serif", letterSpacing: isArabic(w) ? "0.04em" : "0.34em" }}
          >
            {w}
          </span>
          <span aria-hidden className="h-1.5 w-1.5 rotate-45 border border-gold-line" />
        </span>
      ))}
    </div>
  );
  return (
    <div aria-hidden className="marquee border-y border-gold-line/25 bg-bg-secondary py-3">
      <div className="marquee-track">
        <Row />
        <Row />
      </div>
    </div>
  );
}
