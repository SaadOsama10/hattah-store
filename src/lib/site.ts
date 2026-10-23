// Single source of truth for the site's public address and business identity.
// Change NEXT_PUBLIC_SITE_URL (Vercel env) when a custom domain is bought —
// sitemap, canonicals, hreflang, JSON-LD and Open Graph all read it from here.
import { INSTAGRAM_URL, FACEBOOK_URL } from "@/lib/social";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://hattah-store.vercel.app").replace(/\/+$/, "");

export const LOCALES = ["ar", "en", "tr"] as const;
export type SiteLocale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: SiteLocale = "ar";

export const OG_LOCALE: Record<SiteLocale, string> = { ar: "ar_AR", en: "en_US", tr: "tr_TR" };

/** Consistent business facts used by metadata, JSON-LD, About/FAQ and llms.txt. */
export const BUSINESS = {
  name: "HATTAH",
  nameAr: "حَطّة",
  legalDisplay: "HATTAH (حَطّة)",
  city: { ar: "إسطنبول", en: "Istanbul", tr: "İstanbul" },
  country: "TR",
  phone: "+905529987112",
  phoneDisplay: "+90 552 998 71 12",
  email: "hattah.store.co@gmail.com",
  instagram: INSTAGRAM_URL !== "#" ? INSTAGRAM_URL : "https://www.instagram.com/hattah.store.co/",
  facebook: FACEBOOK_URL !== "#" ? FACEBOOK_URL : "https://www.facebook.com/profile.php?id=61593150359220",
  freeDeliveryArea: { ar: "باشاكشهير", en: "Başakşehir", tr: "Başakşehir" },
  logoPath: "/images/hattah-logo.jpg",
} as const;

export const absoluteUrl = (path = "/") => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/** Path under /{locale}, e.g. localizedPath("en", "/shop") → "/en/shop". */
export const localizedPath = (locale: string, path = "") => `/${locale}${path === "/" ? "" : path}`;
