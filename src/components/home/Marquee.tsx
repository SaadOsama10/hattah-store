import { getTranslations } from "next-intl/server";
import { MarqueePause } from "@/components/home/MarqueePause";

const isArabic = (w: string) => /[؀-ۿ]/.test(w);

/** One small cross-stitch (×) in the thread's red — the separator between words. */
function Stitch() {
  return (
    <svg aria-hidden viewBox="0 0 10 10" className="marquee-stitch">
      <path d="M2 2 L8 8 M8 2 L2 8" />
    </svg>
  );
}

/**
 * A quiet word strip between the hero and the first section (homepage only):
 * HATTAH · حطّة · Gaza · Heritage · Identity, separated by small red
 * cross-stitches. A pure CSS loop (translateX), very slow and linear; it
 * moves against the reading direction, pauses on hover/focus and while
 * off screen, and is still and centred under reduced motion. Fixed height
 * (no layout shift); the moving words mount after the page is idle (see
 * MarqueePause). Screen readers get the words once; the copies are aria-hidden.
 */
export async function Marquee() {
  const t = await getTranslations("hero");
  const words = t.raw("marquee") as string[];
  const run = [...words, ...words, ...words];
  const Row = ({ hidden }: { hidden?: boolean }) => (
    <div className="marquee-row" aria-hidden={hidden || undefined}>
      {run.map((w, i) => (
        <span key={i} className="marquee-item">
          <span className={isArabic(w) ? "marquee-word marquee-word-ar" : "marquee-word"}>{w}</span>
          <Stitch />
        </span>
      ))}
    </div>
  );
  return (
    <MarqueePause srText={words.join(" · ")}>
      <div className="marquee-track" aria-hidden>
        <Row hidden />
        <Row hidden />
      </div>
      {/* reduced motion: one still, centred line instead of the loop */}
      <div className="marquee-still" aria-hidden>
        {words.map((w, i) => (
          <span key={i} className="marquee-item">
            <span className={isArabic(w) ? "marquee-word marquee-word-ar" : "marquee-word"}>{w}</span>
            {i < words.length - 1 && <Stitch />}
          </span>
        ))}
      </div>
    </MarqueePause>
  );
}
