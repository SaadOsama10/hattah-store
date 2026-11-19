import { getTranslations } from "next-intl/server";
import { MessageCircle } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/Button";
import { KufiyaDivider } from "@/components/ui/KufiyaDivider";
import { breadcrumbJsonLd, pagePath } from "@/lib/seo";
import { BUSINESS } from "@/lib/site";
import { buildWhatsAppOrderLink } from "@/lib/whatsapp";
import type { Locale } from "@/lib/supabase/types";

/** Shared layout for the simple policy pages (delivery, returns). Copy
 * lives in messages/*.json → policies; {phone} {email} are filled
 * from lib/site.ts so the facts have a single source. */
export async function PolicyPage({ locale, kind }: { locale: Locale; kind: "shipping" | "returns" }) {
  const t = await getTranslations("policies");
  const tSeo = await getTranslations("seo");
  const tHome = await getTranslations("home");
  const fill = (s: string) =>
    s
      .replaceAll("{phone}", BUSINESS.phoneDisplay)
      .replaceAll("{email}", BUSINESS.email);
  const sections = t.raw(`${kind}Sections`) as { h: string; p: string }[];
  const title = t(`${kind}Title`);
  const path = `/${kind}`;

  return (
    <div className="mx-auto max-w-3xl px-gutter pb-section pt-10 sm:pt-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: tSeo("home"), path: pagePath(locale) },
          { name: title, path: pagePath(locale, path) },
        ])}
      />
      <h1 className="font-playfair text-display font-bold text-cream">{title}</h1>
      <KufiyaDivider align="start" className="mt-4" />
      <p className="mt-5 font-inter text-lg leading-relaxed text-cream-secondary">{t(`${kind}Lead`)}</p>
      <div className="mt-10 space-y-4">
        {sections.map((s) => (
          <section key={s.h} className="rounded-card bg-surface p-5 ring-1 ring-line sm:p-6">
            <h2 className="font-playfair text-h3 font-bold text-cream">{s.h}</h2>
            <p className="mt-2 font-inter leading-loose text-cream-secondary" dir="auto">
              {fill(s.p)}
            </p>
          </section>
        ))}
      </div>
      <div className="mt-10">
        <Button href={buildWhatsAppOrderLink(tHome("whatsappGreeting"))} target="_blank" rel="noopener noreferrer" variant="whatsapp" size="lg">
          <MessageCircle size={20} />
          {tHome("ctaButton")}
        </Button>
      </div>
    </div>
  );
}
