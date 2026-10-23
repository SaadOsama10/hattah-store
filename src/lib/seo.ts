import type { Metadata } from "next";
import type { Graph, WithContext, Product, PropertyValue, BreadcrumbList, FAQPage, Organization, LocalBusiness, WebSite, ItemList } from "schema-dts";
import { BUSINESS, DEFAULT_LOCALE, LOCALES, OG_LOCALE, SITE_URL, absoluteUrl, type SiteLocale } from "@/lib/site";
import { productSlug } from "@/lib/slug";
import { effectivePrice, isProductOnSale, localizeCategory, localizeProduct, type CategoryRow, type Locale, type ProductRow } from "@/lib/supabase/types";

/* ─────────────── text helpers ─────────────── */

/** Trims to `max` characters on a word boundary, adding an ellipsis when cut. */
export function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.:;–—-]+$/, "") + "…";
}

/** First sentence(s) of a description, ≤ max chars, markdown-ish noise removed. */
export function summarize(text: string, max = 155): string {
  const clean = text.replace(/[*_#>\-•]+/g, " ").replace(/\s+/g, " ").trim();
  return clip(clean, max);
}

/* ─────────────── URLs & alternates ─────────────── */

export const pagePath = (locale: string, path = "") => `/${locale}${path === "/" ? "" : path}`;

export function alternatesFor(locale: string, path = ""): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = absoluteUrl(pagePath(l, path));
  languages["x-default"] = absoluteUrl(pagePath(DEFAULT_LOCALE, path));
  return { canonical: absoluteUrl(pagePath(locale, path)), languages };
}

export function productPath(row: { id: string; name_en: string }): string {
  return `/product/${productSlug(row)}`;
}

export function categoryPath(key: string): string {
  return `/category/${key}`;
}

/* ─────────────── page metadata ─────────────── */

export function buildMetadata(opts: {
  locale: string;
  path?: string;
  title: string;
  description: string;
  image?: string;
  type?: "website" | "article";
  noindex?: boolean;
}): Metadata {
  const { locale, path = "", title, description, image, type = "website", noindex } = opts;
  const url = absoluteUrl(pagePath(locale, path));
  const images = image ? [{ url: image, alt: title }] : [{ url: absoluteUrl("/images/hattah-logo.jpg"), alt: BUSINESS.name }];
  return {
    title,
    description,
    alternates: alternatesFor(locale, path),
    robots: noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      url,
      siteName: `${BUSINESS.name} | ${BUSINESS.nameAr}`,
      locale: OG_LOCALE[locale as SiteLocale] ?? "ar_AR",
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      type,
      images,
    },
    twitter: { card: "summary_large_image", title, description, images: images.map((i) => i.url) },
  };
}

/* ─────────────── product copy ─────────────── */

const SUFFIX = " | HATTAH";

export function productTitle(name: string): string {
  return clip(name, 60 - SUFFIX.length) + SUFFIX;
}

const TAIL: Record<string, string> = {
  ar: "اطلبها من حَطّة — تراث فلسطيني أصيل، توصيل داخل تركيا.",
  en: "Order from HATTAH — authentic Palestinian heritage, delivered across Turkey.",
  tr: "HATTAH'tan sipariş verin — özgün Filistin mirası, Türkiye'ye teslimat.",
};

export function productDescription(locale: string, name: string, description: string, categoryLabel: string): string {
  const body = summarize(description, 155);
  if (body.length >= 80) return body;
  return clip(`${name}${categoryLabel ? ` — ${categoryLabel}` : ""}. ${TAIL[locale] ?? TAIL.en}`, 155);
}

/** Default alt text for a product photo; an admin-entered alt (per language) wins. */
export function productImageAlt(name: string, categoryLabel: string, custom?: string | null): string {
  return custom?.trim() || (categoryLabel ? `${name} — ${categoryLabel}` : name);
}

/* ─────────────── JSON-LD ─────────────── */

const ORG_ID = `${SITE_URL}/#organization`;
const BUSINESS_ID = `${SITE_URL}/#localbusiness`;
const SITE_ID = `${SITE_URL}/#website`;


export function organizationGraph(locale: string): Graph {
  const sameAs = [BUSINESS.instagram, BUSINESS.facebook];
  const org: Organization = {
    "@type": "Organization",
    "@id": ORG_ID,
    name: BUSINESS.name,
    alternateName: BUSINESS.nameAr,
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: absoluteUrl(BUSINESS.logoPath) },
    email: BUSINESS.email,
    telephone: BUSINESS.phone,
    sameAs,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: BUSINESS.phone,
      email: BUSINESS.email,
      contactType: "customer service",
      availableLanguage: ["Arabic", "English", "Turkish"],
    },
  };
  const local: LocalBusiness = {
    "@type": ["LocalBusiness", "OnlineStore"] as unknown as "LocalBusiness",
    "@id": BUSINESS_ID,
    name: `${BUSINESS.name} (${BUSINESS.nameAr})`,
    url: SITE_URL,
    image: absoluteUrl(BUSINESS.logoPath),
    description:
      locale === "ar"
        ? "متجر إلكتروني في إسطنبول لمنتجات التراث الفلسطيني والغزّي: هوديات، تطريز، لوحات، ميداليات وأكلات منزلية. توصيل في كل تركيا ومجاني في باشاكشهير."
        : locale === "tr"
          ? "İstanbul merkezli çevrimiçi mağaza: Filistin ve Gazze mirasından kapüşonlular, nakış, tablolar, madalyonlar ve ev yapımı yiyecekler. Türkiye'nin her yerine teslimat, Başakşehir'de ücretsiz."
          : "An Istanbul-based online store for Palestinian and Gazan heritage: hoodies, tatreez embroidery, artwork, medallions and homemade food. Delivery across Turkey, free in Başakşehir.",
    telephone: BUSINESS.phone,
    email: BUSINESS.email,
    priceRange: "₺₺",
    address: { "@type": "PostalAddress", addressLocality: "Istanbul", addressCountry: BUSINESS.country },
    areaServed: [
      { "@type": "City", name: "Istanbul" },
      { "@type": "Country", name: "Türkiye" },
    ],
    parentOrganization: { "@id": ORG_ID },
    sameAs,
    knowsLanguage: ["ar", "en", "tr"],
  };
  const site: WebSite = {
    "@type": "WebSite",
    "@id": SITE_ID,
    url: SITE_URL,
    name: `${BUSINESS.name} | ${BUSINESS.nameAr}`,
    inLanguage: locale,
    publisher: { "@id": ORG_ID },
  };
  return { "@context": "https://schema.org", "@graph": [org, local, site] };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): WithContext<BreadcrumbList> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

export function faqJsonLd(items: { q: string; a: string }[]): WithContext<FAQPage> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}

export function productJsonLd(row: ProductRow, locale: Locale, category: CategoryRow | undefined): WithContext<Product> {
  const p = localizeProduct(row, locale);
  const url = absoluteUrl(pagePath(locale, productPath(row)));
  const quantities = row.product_quantities ?? [];
  const price = effectivePrice(row.price, row.sale_price);
  const common = { priceCurrency: "TRY", availability: "https://schema.org/InStock", itemCondition: "https://schema.org/NewCondition", url, seller: { "@id": ORG_ID } } as const;

  const offers: Product["offers"] =
    quantities.length > 0
      ? {
          "@type": "AggregateOffer",
          priceCurrency: "TRY",
          lowPrice: Math.min(...quantities.map((q) => Number(q.price))),
          highPrice: Math.max(...quantities.map((q) => Number(q.price))),
          offerCount: quantities.length,
          availability: common.availability,
          url,
        }
      : { "@type": "Offer", price: Number(price).toFixed(2), ...common };

  const additional: PropertyValue[] = [];
  if (p.sizes.length) additional.push({ "@type": "PropertyValue", name: "Size", value: p.sizes.join(", ") });
  if (p.colors.length) additional.push({ "@type": "PropertyValue", name: "Color", value: p.colors.join(", ") });
  if (p.quantities.length) additional.push({ "@type": "PropertyValue", name: "Options", value: p.quantities.map((q) => q.label).join(", ") });

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: p.name,
    description: summarize(p.description || p.name, 5000),
    image: p.images,
    sku: row.id.slice(0, 8),
    mpn: row.id,
    brand: { "@type": "Brand", name: BUSINESS.name },
    category: category ? localizeCategory(category, locale) : undefined,
    url,
    offers,
    ...(additional.length ? { additionalProperty: additional } : {}),
  };
}

export function itemListJsonLd(name: string, items: { name: string; path: string; image?: string }[]): WithContext<ItemList> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, url: absoluteUrl(it.path), name: it.name })),
  };
}

export { isProductOnSale };
