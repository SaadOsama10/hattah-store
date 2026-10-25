// Per-post hashtag mix: 3 big + 4 medium + 3 niche/local, spread over Arabic / Turkish / English, rotated by recent use,
// and never the exact same set twice in one day.
// The tier sizes are our own approximation of reach (tens of millions / hundreds of thousands / local & brand), not measured counts.

export type Lang = "ar" | "tr" | "en";

const BIG: Record<Lang, string[]> = {
  ar: ["#فلسطين", "#تراث", "#هدايا"],
  tr: ["#İstanbul", "#Türkiye", "#hediye"],
  en: ["#Palestine", "#handmade", "#Istanbul"],
};
const MEDIUM: Record<Lang, string[]> = {
  ar: ["#تراث_فلسطيني", "#تطريز_فلسطيني", "#كوفية", "#هدايا_فلسطينية", "#منتجات_يدوية", "#ديكور_فلسطيني"],
  tr: ["#FilistinKültürü", "#elyapımı", "#hediyelik", "#kefiye", "#İstanbulAlışveriş", "#FilistinMiras"],
  en: ["#PalestinianHeritage", "#Keffiyeh", "#Tatreez", "#PalestinianEmbroidery", "#PalestinianCulture", "#MadeInPalestine"],
};
const LOCAL: Record<Lang, string[]> = {
  ar: ["#حطة_ستور", "#فلسطينيين_في_اسطنبول", "#صنع_بحب", "#حطة"],
  tr: ["#FilistinliGirişimci", "#İstanbuldaFilistin", "#HattahTR"],
  en: ["#HattahStore", "#IstanbulPalestinian", "#PalestinianMadeWithLove", "#Hattah"],
};

export function tagLang(tag: string): Lang {
  if (/[؀-ۿ]/.test(tag)) return "ar";
  if (/[çğıöşüÇĞİÖŞÜ]/.test(tag) || /(hediye|elyap|istanbul|türkiye|filistin|kefiye|nakış|duvar|çay|desen)/i.test(tag)) return "tr";
  return "en";
}

/** Tags on the last paragraph of a stored caption. */
export const parseTags = (caption: string | null): string[] => ((caption ?? "").split("\n\n").pop() ?? "").split(/\s+/).filter((t) => t.startsWith("#"));

const shuffle = <T>(a: T[]) => a.map((x) => [Math.random(), x] as const).sort((x, y) => x[0] - y[0]).map((x) => x[1]);

export interface TagContext {
  /** Tag sets already used by other posts the same Istanbul day (never repeat one exactly). */
  daySets: string[][];
  /** How many times each tag was used in the last few days (less used first = rotation). */
  recentUse: Map<string, number>;
}

/** Builds the 10-tag line for one post. `productTags` = the model's product-specific tags (2 ar + 2 tr + 2 en). */
export function buildTagSet(productTags: string[], ctx: TagContext): string[] {
  const use = (t: string) => ctx.recentUse.get(t.toLowerCase()) ?? 0;
  const take = (pool: string[], n: number, taken: Set<string>) => {
    const out: string[] = [];
    for (const t of shuffle(pool).sort((a, b) => use(a) - use(b))) {
      if (out.length >= n) break;
      if (!taken.has(t.toLowerCase())) {
        out.push(t);
        taken.add(t.toLowerCase());
      }
    }
    return out;
  };
  const key = (a: string[]) => [...a].map((t) => t.toLowerCase()).sort().join(" ");
  const seenSets = new Set(ctx.daySets.map(key));
  const product = [...new Set(productTags.map((t) => "#" + t.replace(/^#+/, "").replace(/\s+/g, "_")).filter((t) => t.length > 2))];
  let best: string[] = [];
  for (let attempt = 0; attempt < 25; attempt++) {
    const taken = new Set<string>();
    const big = (["ar", "tr", "en"] as Lang[]).flatMap((l) => take(BIG[l], 1, taken));
    // 4 medium: one per language + one more from a rotating language
    const extra = shuffle(["ar", "tr", "en"] as Lang[])[0];
    const medium = [...(["ar", "tr", "en"] as Lang[]).flatMap((l) => take(MEDIUM[l], 1, taken)), ...take(MEDIUM[extra], 1, taken)];
    // 3 niche/local: two product-specific (different languages when possible) + one local/brand tag
    const niche: string[] = [];
    const langsUsed = new Set<Lang>();
    for (const t of shuffle(product)) {
      if (niche.length >= 2) break;
      if (taken.has(t.toLowerCase()) || langsUsed.has(tagLang(t))) continue;
      niche.push(t);
      taken.add(t.toLowerCase());
      langsUsed.add(tagLang(t));
    }
    for (const t of shuffle(product)) {
      if (niche.length >= 2) break;
      if (!taken.has(t.toLowerCase())) {
        niche.push(t);
        taken.add(t.toLowerCase());
      }
    }
    const localLang = shuffle(["ar", "tr", "en"] as Lang[])[0];
    niche.push(...take(LOCAL[localLang], 1, taken));
    while (niche.length < 3) niche.push(...take([...LOCAL.ar, ...LOCAL.tr, ...LOCAL.en], 1, taken));
    const set = [...big, ...medium, ...niche];
    best = set;
    if (!seenSets.has(key(set))) return set;
  }
  return best;
}

export function countRecentUse(captions: (string | null)[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of captions) for (const t of parseTags(c)) m.set(t.toLowerCase(), (m.get(t.toLowerCase()) ?? 0) + 1);
  return m;
}
