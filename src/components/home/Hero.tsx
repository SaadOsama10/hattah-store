import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowDown, MessageCircle } from "lucide-react";
import { buildWhatsAppOrderLink } from "@/lib/whatsapp";

/** Arabic diacritics — the headline is always rendered without them. */
const stripTashkeel = (s: string) => s.replace(/[ً-ٰٟۖ-ۭ]/g, "");
const bare = (w: string) => w.replace(/[.,،!?؟]/g, "");

/**
 * Hero — one focus: the headline. A calm warm background with a single
 * static pool of light, the logo at medium size, the headline appearing
 * word by word (≤1.2 s), and one word stitched underneath with the red
 * embroidery thread. The page-long thread (components/ui/Thread.tsx)
 * starts from the logo (data-thread-start). No canvas, no loops.
 */
export async function Hero() {
  const t = await getTranslations("hero");
  const tHome = await getTranslations("home");
  const words = stripTashkeel(t("title")).split(/\s+/);
  const focus = bare(stripTashkeel(t("focus")));
  const whatsappHref = buildWhatsAppOrderLink(tHome("whatsappGreeting"));
  const step = 110;
  const stitchAt = 150 + words.length * step + 250;

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-inner">
        <Image
          src="/images/hattah-logo-400.webp"
          alt="HATTAH — حَطّة"
          width={96}
          height={96}
          priority
          data-thread-start
          className="hero-logo"
        />
        <p className="hero-badge">{t("badge")}</p>
        <h1 id="hero-title" className="hero-title font-playfair">
          {words.map((w, i) => {
            const isFocus = bare(w) === focus;
            return (
              <span key={i}>
                <span className={isFocus ? "hero-word hero-focus" : "hero-word"} style={{ animationDelay: `${150 + i * step}ms` }}>
                  {w}
                  {isFocus && (
                    <svg className="hero-stitch" viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden>
                      <path
                        d="M2 8 L12 4 L22 10 L32 4 L42 10 L52 4 L62 10 L72 4 L82 10 L92 4 L102 10 L112 4 L122 10 L132 4 L142 10 L152 4 L162 10 L172 4 L182 10 L198 6"
                        pathLength={1}
                        style={{ animationDelay: `${stitchAt}ms` }}
                      />
                    </svg>
                  )}
                </span>
                {i < words.length - 1 && " "}
              </span>
            );
          })}
        </h1>
        <p className="hero-sub">
          {t("subtitle")}
        </p>
        <div className="hero-ctas" style={{ animationDelay: `${stitchAt - 50}ms` }}>
          <a href="#collection" className="hero-btn hero-btn-primary">
            <span>{t("ctaPrimary")}</span>
            <ArrowDown size={18} aria-hidden />
          </a>
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="hero-btn hero-btn-ghost">
            <MessageCircle size={18} aria-hidden />
            <span>{t("ctaSecondary")}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
