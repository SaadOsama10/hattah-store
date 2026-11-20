import "server-only";
import { unstable_cache } from "next/cache";
import { getServiceSupabaseClient } from "@/lib/supabase/service";

/**
 * Best-seller ranking derived from the real sales ledger (/admin/sales →
 * tables sales/sale_items, service role only). Returns product ids, best
 * first — never the quantities themselves, so no sales figure ever
 * reaches the public page.
 *
 * Most sale lines are free text ("هودي", "سبانخ", …) and only some carry
 * a product_id, so:
 *  - a line with product_id counts fully for that product;
 *  - a free-text line is matched against the Arabic product names: its
 *    meaningful words (generic ones like "فلسطين", sizes, "إجمالي" are
 *    ignored) are looked up in every name, the products matching the
 *    most words share the line's quantity equally. Lines that match
 *    nothing (delivery, unitemized revenue, …) are ignored.
 */

const STOP = new Set(
  [
    "فلسطين", "فلسطيني", "فلسطينيه", "فلسطينية", "كبير", "كبيره", "كبار", "صغير", "صغيره", "صغار", "اجمالي", "بعض", "مع",
    "مقاس", "قطعه", "متنوع", "كيلو", "كغم", "نص", "بالقطعه", "طلبيه", "ايراد", "يوم", "المعرض", "مفصل", "بالصنف", "غير",
    "مبيعات", "متفرقه", "توصيل", "مواصلات", "بيعوا", "اكل", "ولادي", "تصميم", "لون", "اللون",
  ].map((w) => normalize(w))
);

function normalize(s: string): string {
  return s
    .replace(/[ً-ٰٟـ]/g, "") // harakat, dagger alef, tatweel
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .toLowerCase();
}

function tokens(s: string): string[] {
  return normalize(s)
    .split(/[^\p{L}]+/u)
    .map((w) => w.replace(/^(ال|وال|بال)/, ""))
    .filter((w) => w.length >= 3 && !STOP.has(w));
}

async function computeRanking(): Promise<string[]> {
  try {
    const supabase = getServiceSupabaseClient();
    const [{ data: items, error: e1 }, { data: products, error: e2 }] = await Promise.all([
      supabase.from("sale_items").select("item_name, product_id, quantity"),
      supabase.from("products").select("id, name_ar"),
    ]);
    if (e1 || e2) throw new Error((e1 ?? e2)!.message);

    const names = (products ?? []).map((p) => ({ id: p.id as string, name: normalize(p.name_ar as string) }));
    const valid = new Set(names.map((p) => p.id));
    const score = new Map<string, number>();
    const add = (id: string, v: number) => score.set(id, (score.get(id) ?? 0) + v);

    for (const it of items ?? []) {
      const qty = Number(it.quantity) > 0 ? Number(it.quantity) : 1;
      if (it.product_id && valid.has(it.product_id)) {
        add(it.product_id, qty);
        continue;
      }
      const words = tokens(String(it.item_name ?? ""));
      if (words.length === 0) continue;
      let best = 0;
      let matches: string[] = [];
      for (const p of names) {
        const n = words.filter((w) => p.name.includes(w)).length;
        if (n === 0) continue;
        if (n > best) {
          best = n;
          matches = [p.id];
        } else if (n === best) matches.push(p.id);
      }
      for (const id of matches) add(id, qty / matches.length);
    }

    return [...score.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  } catch (err) {
    console.error("best-seller ranking failed, continuing without it:", err);
    return [];
  }
}

// Sales change a few times a day at most; an hourly refresh is plenty.
export const getBestSellerRanking = unstable_cache(computeRanking, ["bestseller-ranking-v1"], {
  tags: ["products", "sales"],
  revalidate: 3600,
});
