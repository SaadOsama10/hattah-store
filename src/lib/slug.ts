// SEO-friendly product URLs without a DB column: "<english-name-slug>-<first 8 of id>".
// The 8-hex suffix is what identifies the product, so renaming a product never breaks a
// link (the page 308-redirects to the current canonical slug).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHORT_RE = /-([0-9a-f]{8})$/i;

export function slugify(input: string, max = 60): string {
  const s = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s.slice(0, max).replace(/-+$/g, "") || "product";
}

export function productSlug(p: { id: string; name_en: string }): string {
  return `${slugify(p.name_en)}-${p.id.slice(0, 8).toLowerCase()}`;
}

export const isUuid = (s: string) => UUID_RE.test(s);

/** The 8-hex id prefix at the end of a product slug, or null. */
export function shortIdFromSlug(slug: string): string | null {
  const m = SHORT_RE.exec(slug);
  return m ? m[1].toLowerCase() : null;
}
