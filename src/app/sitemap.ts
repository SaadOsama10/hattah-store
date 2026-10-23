import type { MetadataRoute } from "next";
import { getAllProducts, getCategories, hasActiveOffers } from "@/lib/supabase/queries";
import { LOCALES, SITE_URL, DEFAULT_LOCALE, absoluteUrl } from "@/lib/site";
import { categoryPath, pagePath, productPath } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Entry = MetadataRoute.Sitemap[number];

/** One entry per URL, each carrying hreflang alternates for all 3 languages (+ x-default = Arabic). */
function entry(path: string, lastModified: Date, priority: number, changeFrequency: Entry["changeFrequency"]): Entry[] {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = absoluteUrl(pagePath(l, path));
  languages["x-default"] = absoluteUrl(pagePath(DEFAULT_LOCALE, path));
  return LOCALES.map((l) => ({
    url: absoluteUrl(pagePath(l, path)),
    lastModified,
    changeFrequency,
    priority,
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, offers] = await Promise.all([getAllProducts(), getCategories(), hasActiveOffers()]);
  const newest = products.reduce((d, p) => (new Date(p.created_at) > d ? new Date(p.created_at) : d), new Date(0));
  const stamp = newest.getTime() > 0 ? newest : new Date();

  const out: Entry[] = [
    ...entry("", stamp, 1, "daily"),
    ...entry("/shop", stamp, 0.9, "daily"),
    ...(offers ? entry("/offers", stamp, 0.7, "daily") : []),
    ...entry("/about", stamp, 0.6, "monthly"),
    ...entry("/faq", stamp, 0.6, "monthly"),
    ...entry("/privacy", stamp, 0.3, "yearly"),
    ...entry("/data-deletion", stamp, 0.3, "yearly"),
  ];
  for (const c of categories) out.push(...entry(categoryPath(c.key), stamp, 0.8, "weekly"));
  for (const p of products) out.push(...entry(productPath(p), new Date(p.created_at), 0.7, "weekly"));
  void SITE_URL;
  return out;
}
