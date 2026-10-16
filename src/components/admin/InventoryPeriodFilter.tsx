"use client";

import { useMemo } from "react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import {
  isFiltered,
  presetRange,
  summarizePeriod,
  type PeriodPreset,
  type InventoryView,
  type PeriodRange,
} from "@/lib/inventory-period";
import type { InventoryBatchWithEntries } from "@/lib/supabase/types";

const PRESETS: [PeriodPreset, string][] = [
  ["today", "اليوم"],
  ["last7", "آخر 7 أيام"],
  ["thisMonth", "هذا الشهر"],
  ["lastMonth", "الشهر الماضي"],
  ["last30", "آخر 30 يوم"],
  ["all", "الكل"],
];

const VIEWS: [InventoryView, string][] = [
  ["all", "الكل"],
  ["purchases", "المشتريات"],
  ["sales", "المبيعات"],
];

const money = (n: number) => `₺ ${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

const dateInputClass =
  "w-full rounded-lg border border-cream/20 bg-bg-primary px-2 py-1.5 font-inter text-sm text-cream focus:border-terracotta focus:outline-none";

/** Period filter for the inventory ledger. The chosen range lives in the URL
 * (?from=YYYY-MM-DD&to=YYYY-MM-DD) so refresh and shared links keep it. With no
 * range set the panel shows only the controls — the rest of the page is the
 * unchanged all-time view. */
export function InventoryPeriodFilter({
  batches,
  range,
  view,
}: {
  batches: InventoryBatchWithEntries[];
  range: PeriodRange;
  view: InventoryView;
}) {
  const router = useRouter();
  const filtered = isFiltered(range);
  const summary = useMemo(() => summarizePeriod(batches, range), [batches, range]);

  function apply(next: PeriodRange, nextView: InventoryView = view) {
    const qs = new URLSearchParams();
    if (nextView !== "all") qs.set("view", nextView);
    if (next.from) qs.set("from", next.from);
    if (next.to) qs.set("to", next.to);
    const q = qs.toString();
    router.replace(`/admin/inventory${q ? `?${q}` : ""}`, { scroll: false });
  }

  const activePreset = PRESETS.find(([key]) => {
    const r = presetRange(key);
    return r.from === range.from && r.to === range.to;
  })?.[0];

  return (
    <section className="mb-6 rounded-2xl border border-cream/10 bg-bg-secondary p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-playfair text-lg font-bold text-cream">فترة زمنية</h2>
        <div className="inline-flex rounded-full border border-cream/20 p-0.5" role="tablist">
          {VIEWS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={view === key}
              onClick={() => apply(range, key)}
              className={cn(
                "rounded-full px-4 py-1.5 font-inter text-xs transition-colors",
                view === key ? "bg-terracotta text-cream" : "text-cream-secondary hover:text-cream"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:max-w-md">
        <label className="block">
          <span className="mb-1 block font-inter text-xs uppercase tracking-widest text-cream-secondary/50">من</span>
          <input
            type="date"
            value={range.from ?? ""}
            max={range.to ?? undefined}
            onChange={(e) => apply({ from: e.target.value || null, to: range.to })}
            className={dateInputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-inter text-xs uppercase tracking-widest text-cream-secondary/50">إلى</span>
          <input
            type="date"
            value={range.to ?? ""}
            min={range.from ?? undefined}
            onChange={(e) => apply({ from: range.from, to: e.target.value || null })}
            className={dateInputClass}
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => apply(presetRange(key))}
            className={cn(
              "rounded-full border px-4 py-1.5 font-inter text-xs transition-colors",
              (key === "all" ? !filtered : activePreset === key)
                ? "border-terracotta bg-terracotta text-cream"
                : "border-cream/20 text-cream-secondary hover:text-cream"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered && (
        <div className="mt-5">
          <p className="mb-3 font-inter text-sm text-cream-secondary/70" dir="ltr" style={{ textAlign: "right" }}>
            {range.from ?? "…"} → {range.to ?? "…"}
          </p>

          {summary.batches.length === 0 ? (
            <p className="rounded-xl border border-dashed border-cream/15 py-8 text-center font-inter text-sm text-cream-secondary/60">
              ما في بيانات بالفترة
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Tile label="المشتريات" value={money(summary.purchases)} />
                <Tile label="المبيعات (الإيراد)" value={money(summary.sales)} />
                <Tile label="المدفوع" value={money(summary.paid)} />
                <Tile label="الدين" value={money(summary.debt)} tone={summary.debt > 0 ? "debt" : "clear"} />
                <Tile label="عدد الدفعات" value={String(summary.batches.length)} />
                <Tile label="عدد الأصناف" value={String(summary.itemCount)} />
                <div className="col-span-2">
                  <Tile
                    label="صافي الفترة: مبيعات − مشتريات"
                    value={money(summary.net)}
                    tone={summary.net >= 0 ? "clear" : "debt"}
                  />
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border border-cream/10">
                <table className="w-full min-w-[34rem] text-right font-inter text-sm">
                  <thead>
                    <tr className="border-b border-cream/10 text-xs text-cream-secondary/60">
                      <th className="px-3 py-2 font-medium">الدفعة</th>
                      <th className="px-3 py-2 font-medium">التاريخ</th>
                      <th className="px-3 py-2 font-medium">التكلفة</th>
                      <th className="px-3 py-2 font-medium">الإيراد</th>
                      <th className="px-3 py-2 font-medium">المدفوع</th>
                      <th className="px-3 py-2 font-medium">الدين</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.batches.map((r) => (
                      <tr key={r.batch.id} className="border-b border-cream/5 last:border-0 text-cream">
                        <td className="px-3 py-2">{r.batch.title}</td>
                        <td className="px-3 py-2 whitespace-nowrap" dir="ltr">{r.batch.batch_date}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{money(r.purchases)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{money(r.sales)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{money(r.paid)}</td>
                        <td className={cn("px-3 py-2 whitespace-nowrap", r.debt > 0 && "text-terracotta-deep")}>
                          {money(r.debt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function Tile({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "debt" | "clear" }) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        tone === "debt" ? "border-terracotta-deep/30 bg-terracotta-deep/10" : "border-cream/10 bg-bg-primary"
      )}
    >
      <p className="font-inter text-xs text-cream-secondary/60">{label}</p>
      <p
        className={cn(
          "mt-1 font-playfair text-lg font-bold",
          tone === "debt" ? "text-terracotta-deep" : tone === "clear" ? "text-forest" : "text-cream"
        )}
      >
        {value}
      </p>
    </div>
  );
}
