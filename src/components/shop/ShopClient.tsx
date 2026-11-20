"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpDown, MessageCircle, Search, SearchX, X } from "lucide-react";
import { ProductCard } from "@/components/ui/ProductCard";
import { Button } from "@/components/ui/Button";
import { KufiyaDivider } from "@/components/ui/KufiyaDivider";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";
import { playClick } from "@/lib/sound";
import { sortPrice, type CardProduct } from "@/lib/storefront";
import { buildWhatsAppOrderLink } from "@/lib/whatsapp";

export interface ShopItem extends CardProduct {
  category: string;
  createdAt: string;
  /** Position in the sales-based best-seller ranking (lower = better); null = no sales data. */
  rank: number | null;
  /** Lower-cased names (current language + English) for search. */
  search: string;
}

export interface ShopCategory {
  key: string;
  label: string;
  /** All keys that count as "in" this category (itself + its subcategories). */
  keys: string[];
  children: { key: string; label: string }[];
}

export type SortKey = "newest" | "best" | "price-asc" | "price-desc";
const SORTS: SortKey[] = ["newest", "best", "price-asc", "price-desc"];
const PAGE_SIZE = 24;

/**
 * Product listing with a sticky filter bar: category pills (top level,
 * then subcategories), search and sort. State mirrors into the URL
 * (?category= &sort= &q=) without a reload so a filtered view can be
 * shared. On a category page (`scope`) only that category's
 * subcategories are offered.
 */
export function ShopClient({
  items,
  categories,
  initialCategory = "all",
  initialSort = "newest",
  initialQuery = "",
  scope,
}: {
  items: ShopItem[];
  categories: ShopCategory[];
  initialCategory?: string;
  initialSort?: SortKey;
  initialQuery?: string;
  scope?: string;
}) {
  const t = useTranslations("shop");
  const tCommon = useTranslations("common");
  const tHome = useTranslations("home");

  const parentOf = (key: string) => categories.find((c) => c.key === key || c.children.some((ch) => ch.key === key));
  const initialParent = scope ?? parentOf(initialCategory)?.key ?? "all";
  const [parent, setParent] = useState<string>(initialParent);
  const [child, setChild] = useState<string>(
    initialCategory !== "all" && initialCategory !== initialParent ? initialCategory : "all"
  );
  const [sort, setSort] = useState<SortKey>(SORTS.includes(initialSort) ? initialSort : "newest");
  const [query, setQuery] = useState(initialQuery);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const parentNode = categories.find((c) => c.key === parent);

  // Mirror the filters into the address bar (no navigation, no reload).
  useEffect(() => {
    const url = new URL(window.location.href);
    const set = (k: string, v: string | null) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k));
    set("category", scope ? (child !== "all" ? child : null) : child !== "all" ? child : parent !== "all" ? parent : null);
    set("sort", sort !== "newest" ? sort : null);
    set("q", query.trim() || null);
    window.history.replaceState(window.history.state, "", url.pathname + url.search);
  }, [parent, child, sort, query, scope]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const allowed =
      child !== "all" ? new Set([child]) : parentNode ? new Set(parentNode.keys) : null;
    const list = items.filter((p) => (!allowed || allowed.has(p.category)) && (!q || p.search.includes(q)));
    const byNewest = (a: ShopItem, b: ShopItem) => b.createdAt.localeCompare(a.createdAt);
    return [...list].sort((a, b) => {
      if (sort === "best") {
        const ra = a.rank ?? Infinity;
        const rb = b.rank ?? Infinity;
        return ra !== rb ? ra - rb : byNewest(a, b);
      }
      if (sort === "price-asc" || sort === "price-desc") {
        const pa = sortPrice(a);
        const pb = sortPrice(b);
        // Price-on-request products have no price: always after the priced ones.
        if (pa === null || pb === null) return pa === pb ? byNewest(a, b) : pa === null ? 1 : -1;
        return sort === "price-asc" ? pa - pb : pb - pa;
      }
      return byNewest(a, b);
    });
  }, [items, parentNode, child, query, sort]);

  function pickParent(key: string) {
    playClick();
    setParent(key);
    setChild("all");
    setVisible(PAGE_SIZE);
  }
  function pickChild(key: string) {
    playClick();
    setChild(key);
    setVisible(PAGE_SIZE);
  }
  function reset() {
    setParent(scope ?? "all");
    setChild("all");
    setQuery("");
    setSort("newest");
    setVisible(PAGE_SIZE);
  }

  const pill = (active: boolean) =>
    cn(
      "inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full px-4 font-inter text-sm font-semibold transition-colors duration-200",
      active ? "bg-cream text-bg-primary" : "bg-surface text-cream ring-1 ring-line hover:ring-line-strong"
    );
  const subPill = (active: boolean) =>
    cn(
      "inline-flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-full px-3.5 font-inter text-[13px] transition-colors duration-200",
      active ? "bg-olive-wash font-semibold text-olive ring-1 ring-olive/40" : "text-cream-secondary hover:text-cream"
    );

  const showChildren = parentNode && parentNode.children.length > 0;

  return (
    <div>
      {/* ── Sticky filter bar ── */}
      <div className="sticky top-[var(--header-offset,4rem)] z-30 border-b border-line bg-[var(--t-header-bg)] backdrop-blur-xl backdrop-saturate-150 transition-[top] duration-300 ease-soft">
        <div className="mx-auto max-w-7xl px-gutter py-3">
          {!scope && (
            <div role="group" aria-label={t("categoryFilter")} className="scrollbar-none -mx-gutter flex gap-2 overflow-x-auto px-gutter">
              <button type="button" onClick={() => pickParent("all")} aria-pressed={parent === "all"} className={pill(parent === "all")}>
                {t("filterAll")}
              </button>
              {categories.map((c) => (
                <button key={c.key} type="button" onClick={() => pickParent(c.key)} aria-pressed={parent === c.key} className={pill(parent === c.key)}>
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {showChildren && (
            <div className={cn("scrollbar-none -mx-gutter flex gap-1.5 overflow-x-auto px-gutter", !scope && "mt-2")}>
              <button type="button" onClick={() => pickChild("all")} aria-pressed={child === "all"} className={subPill(child === "all")}>
                {t("allSubcategories")}
              </button>
              {parentNode.children.map((ch) => (
                <button key={ch.key} type="button" onClick={() => pickChild(ch.key)} aria-pressed={child === ch.key} className={subPill(child === ch.key)}>
                  {ch.label}
                </button>
              ))}
            </div>
          )}

          <div className="mt-2.5 flex items-center gap-2">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">{tCommon("search")}</span>
              <Search size={17} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setVisible(PAGE_SIZE);
                }}
                placeholder={t("searchPlaceholder")}
                className="h-11 w-full rounded-full bg-surface ps-10 pe-10 font-inter text-[15px] text-cream ring-1 ring-line placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-terracotta [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label={t("clearSearch")}
                  className="absolute end-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:text-cream"
                >
                  <X size={16} />
                </button>
              )}
            </label>
            <label className="relative shrink-0">
              <span className="sr-only">{t("sortLabel")}</span>
              <ArrowUpDown size={15} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <select
                value={sort}
                onChange={(e) => {
                  playClick();
                  setSort(e.target.value as SortKey);
                }}
                className="h-11 max-w-[11.5rem] appearance-none rounded-full bg-surface ps-9 pe-4 font-inter text-sm font-semibold text-cream ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-terracotta"
              >
                <option value="newest">{t("sortNewest")}</option>
                <option value="best">{t("sortBest")}</option>
                <option value="price-asc">{t("sortPriceAsc")}</option>
                <option value="price-desc">{t("sortPriceDesc")}</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* ── Results ── */}
      <div className="mx-auto max-w-7xl px-gutter pb-section pt-5">
        {/* keeps the heading outline h1 → h2 → product h3 */}
        <h2 className="sr-only">{t("title")}</h2>
        <p className="mb-4 font-inter text-sm text-muted" aria-live="polite">
          {t("count", { count: filtered.length })}
        </p>

        {filtered.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center rounded-panel bg-bg-secondary px-6 py-14 text-center ring-1 ring-line">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface text-olive ring-1 ring-line">
              <SearchX size={28} strokeWidth={1.5} />
            </span>
            <h2 className="mt-5 font-playfair text-h3 font-bold text-cream">{t("emptyTitle")}</h2>
            <KufiyaDivider size="sm" className="mt-3" />
            <p className="mt-3 font-inter text-sm leading-relaxed text-cream-secondary">{t("emptyHint")}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button variant="secondary" onClick={reset}>
                {t("clearFilters")}
              </Button>
              <Button
                variant="whatsapp"
                href={buildWhatsAppOrderLink(query.trim() ? `${tHome("whatsappGreeting")} ${query.trim()}` : tHome("whatsappGreeting"))}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={18} />
                {t("askWhatsapp")}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-x-3.5 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
              {filtered.slice(0, visible).map((p, i) =>
                // The first row paints with the HTML (it holds the LCP image); later cards fade in as they scroll in.
                i < 4 ? (
                  <li key={p.id}>
                    <ProductCard product={p} priority />
                  </li>
                ) : (
                  <Reveal as="li" key={p.id} delay={(i % 4) * 60}>
                    <ProductCard product={p} />
                  </Reveal>
                )
              )}
            </ul>
            {visible < filtered.length && (
              <div className="mt-12 flex justify-center">
                <Button variant="secondary" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                  {tCommon("loadMore")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
