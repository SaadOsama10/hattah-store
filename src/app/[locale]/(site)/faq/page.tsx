import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { JsonLd } from "@/components/seo/JsonLd";
import { BUSINESS } from "@/lib/site";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd, pagePath } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  return buildMetadata({ locale, path: "/faq", title: t("faqTitle"), description: t("faqDescription") });
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("faq");
  const tSeo = await getTranslations("seo");
  const tAbout = await getTranslations("about");
  const items = (t.raw("items") as { q: string; a: string }[]).map((i) => ({
    q: i.q,
    a: i.a.replace("{phone}", BUSINESS.phoneDisplay),
  }));

  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-32 sm:px-8 sm:pt-36">
      <JsonLd
        data={[
          faqJsonLd(items),
          breadcrumbJsonLd([
            { name: tSeo("home"), path: pagePath(locale) },
            { name: tSeo("faq"), path: pagePath(locale, "/faq") },
          ]),
        ]}
      />
      <h1 className="font-playfair text-4xl font-bold text-cream sm:text-5xl">{t("title")}</h1>
      <p className="mt-4 font-inter text-cream-secondary">{t("lead")}</p>

      <div className="mt-10 divide-y divide-cream/10 rounded-2xl border border-cream/10 bg-bg-secondary/50">
        {items.map((item) => (
          <details key={item.q} className="group px-5 py-4">
            <summary className="cursor-pointer list-none font-inter font-semibold text-cream marker:hidden">
              <h2 className="inline text-base font-semibold">{item.q}</h2>
            </summary>
            <p className="mt-3 font-inter leading-loose text-cream-secondary/90">{item.a}</p>
          </details>
        ))}
      </div>

      <div className="mt-10">
        <Button href="/shop" variant="primary">
          {tAbout("cta")}
        </Button>
      </div>
    </div>
  );
}
