import { getAllProducts, getCategories } from "@/lib/supabase/queries";
import { BUSINESS, LOCALES, SITE_URL, absoluteUrl } from "@/lib/site";
import { categoryPath, pagePath, productPath, summarize } from "@/lib/seo";
import { buildCategoryTree } from "@/lib/categories";
import { effectivePrice, localizeCategory, localizeProduct, isProductOnSale, type Locale } from "@/lib/supabase/types";

const lines = (...l: (string | false | null | undefined)[]) => l.filter((x) => x !== false && x != null).join("\n");

function header(): string {
  return lines(
    `# ${BUSINESS.name} (${BUSINESS.nameAr})`,
    "",
    `> ${BUSINESS.name} (حَطّة) is an online store based in Istanbul, Türkiye, selling authentic Palestinian and Gazan heritage products: hoodies with heritage designs, tatreez embroidery, artwork, medallions and necklaces, and homemade Palestinian food. Orders are placed in the online store or on WhatsApp. Delivery covers all of Türkiye and is free in Başakşehir, Istanbul.`,
    "",
    "## Business facts",
    `- Name: ${BUSINESS.name} (${BUSINESS.nameAr})`,
    `- Location: Istanbul, Türkiye (online store; no public storefront)`,
    `- WhatsApp / phone: ${BUSINESS.phoneDisplay}`,
    `- Email: ${BUSINESS.email}`,
    `- Instagram: ${BUSINESS.instagram}`,
    `- Facebook: ${BUSINESS.facebook}`,
    `- Currency: Turkish lira (TRY)`,
    `- Languages: Arabic, English, Turkish (URLs start with /ar, /en, /tr)`,
    `- Delivery: all of Türkiye; free in Başakşehir (Istanbul)`,
    `- How to order: add products to the cart and send the order on WhatsApp, or message ${BUSINESS.phoneDisplay} directly`,
  );
}

export async function buildLlmsTxt(): Promise<string> {
  const categories = await getCategories();
  const tree = buildCategoryTree(categories);
  const L: Locale = "en";
  return lines(
    header(),
    "",
    "## Key pages",
    ...LOCALES.flatMap((l) => [
      `- [Home (${l})](${absoluteUrl(pagePath(l))})`,
      `- [Shop (${l})](${absoluteUrl(pagePath(l, "/shop"))})`,
      `- [About HATTAH (${l})](${absoluteUrl(pagePath(l, "/about"))})`,
      `- [FAQ (${l})](${absoluteUrl(pagePath(l, "/faq"))})`,
    ]),
    "",
    "## Product categories",
    ...tree.flatMap((n) => [
      `- [${localizeCategory(n, L)}](${absoluteUrl(pagePath("en", categoryPath(n.key)))})`,
      ...n.children.map((c) => `  - [${localizeCategory(c, L)}](${absoluteUrl(pagePath("en", categoryPath(c.key)))})`),
    ]),
    "",
    "## Optional",
    `- [Full product catalog (plain text)](${SITE_URL}/llms-full.txt)`,
    `- [Sitemap](${SITE_URL}/sitemap.xml)`,
    "",
  );
}

export async function buildLlmsFullTxt(): Promise<string> {
  const [products, categories] = await Promise.all([getAllProducts(), getCategories()]);
  const catByKey = new Map(categories.map((c) => [c.key, c]));
  const out: string[] = [header(), "", `## Product catalog (${products.length} products, prices in TRY)`, ""];
  for (const row of products) {
    const en = localizeProduct(row, "en");
    const ar = localizeProduct(row, "ar");
    const tr = localizeProduct(row, "tr");
    const cat = catByKey.get(row.category);
    const price = effectivePrice(row.price, row.sale_price);
    out.push(
      `### ${en.name}`,
      `- Arabic name: ${ar.name}`,
      `- Turkish name: ${tr.name}`,
      cat ? `- Category: ${localizeCategory(cat, "en")} (${localizeCategory(cat, "ar")})` : "",
      en.quantities.length
        ? `- Price options: ${en.quantities.map((q) => `${q.label} — ${q.price} TRY`).join("; ")}`
        : isProductOnSale(row.price, row.sale_price)
          ? `- Price: ${price} TRY (was ${row.price} TRY)`
          : `- Price: ${price} TRY`,
      en.sizes.length ? `- Sizes: ${en.sizes.join(", ")}` : "",
      en.colors.length ? `- Colors: ${en.colors.join(", ")}` : "",
      `- Availability: in stock — order in the store or on WhatsApp ${BUSINESS.phoneDisplay}`,
      ...LOCALES.map((l) => `- URL (${l}): ${absoluteUrl(pagePath(l, productPath(row)))}`),
      en.images[0] ? `- Image: ${en.images[0]}` : "",
      en.description ? `- Description (EN): ${summarize(en.description, 700)}` : "",
      ar.description ? `- Description (AR): ${summarize(ar.description, 700)}` : "",
      "",
    );
  }
  return out.filter((x, i, a) => !(x === "" && a[i - 1] === "")).join("\n");
}
