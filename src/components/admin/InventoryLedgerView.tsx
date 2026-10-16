"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  groupByDayAndBatch,
  groupByNote,
  ledgerRows,
  sumRows,
  summarizePeriod,
  type LedgerRow,
  type PeriodRange,
} from "@/lib/inventory-period";
import type { InventoryBatchWithEntries } from "@/lib/supabase/types";

const money = (n: number) => `₺ ${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const NO_NOTE = "بدون ملاحظة";

/** Flat purchases / sales views of the ledger, honouring the period filter. */
export function InventoryLedgerView({
  batches,
  range,
  view,
}: {
  batches: InventoryBatchWithEntries[];
  range: PeriodRange;
  view: "purchases" | "sales";
}) {
  const [grouped, setGrouped] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const isSales = view === "sales";

  const rows = useMemo(() => ledgerRows(batches, range, view), [batches, range, view]);
  const total = useMemo(() => sumRows(rows), [rows]);
  const period = useMemo(() => summarizePeriod(batches, range), [batches, range]);
  const purchaseBatches = useMemo(() => {
    const ids = new Set(rows.map((r) => r.batchId));
    return period.batches.filter((b) => ids.has(b.batch.id));
  }, [rows, period]);
  const days = useMemo(() => groupByDayAndBatch(rows, batches), [rows, batches]);

  if (rows.length === 0) {
    return (
      <p className="mb-6 rounded-2xl border border-dashed border-cream/15 py-12 text-center font-inter text-sm text-cream-secondary/60">
        ما في بيانات بالفترة
      </p>
    );
  }

  const qtySum = rows.reduce((s, r) => s + r.qty, 0);

  return (
    <div className="mb-6">
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {isSales ? (
          <>
            <Tile label="إجمالي المبيعات" value={money(total)} tone="clear" />
            <Tile label="عدد القطع المباعة" value={qtySum.toLocaleString("en-US")} />
            <Tile label="عدد الصفوف" value={String(rows.length)} />
            <Tile label="متوسط قيمة الصف" value={money(Math.round((total / rows.length) * 100) / 100)} />
          </>
        ) : (
          <>
            <Tile label="إجمالي المشتريات" value={money(total)} />
            <Tile label="المدفوع" value={money(purchaseBatches.reduce((s, b) => s + b.paid, 0))} />
            <Tile
              label="الدين"
              value={money(purchaseBatches.reduce((s, b) => s + b.debt, 0))}
              tone={purchaseBatches.some((b) => b.debt > 0) ? "debt" : "clear"}
            />
            <Tile label="عدد الدفعات" value={String(purchaseBatches.length)} />
            <Tile label="عدد الأصناف" value={String(rows.length)} />
          </>
        )}
      </div>

      {isSales && (
        <button
          type="button"
          onClick={() => setGrouped((g) => !g)}
          className={cn(
            "mb-3 rounded-full border px-4 py-1.5 font-inter text-xs transition-colors",
            grouped
              ? "border-terracotta bg-terracotta text-cream"
              : "border-cream/20 text-cream-secondary hover:text-cream"
          )}
        >
          تجميع حسب الطلبية
        </button>
      )}

      <div className="space-y-6">
        {days.map((day) => (
          <section key={day.date}>
            <h3 className="mb-2 font-playfair text-base font-bold text-cream" dir="ltr" style={{ textAlign: "right" }}>
              {day.date}
            </h3>
            <div className="space-y-3">
              {day.batches.map((g) => {
                const isCollapsed = collapsed.has(g.batch.id);
                return (
                  <div key={g.batch.id} className="overflow-hidden rounded-2xl border border-cream/10 bg-bg-secondary">
                    <button
                      type="button"
                      onClick={() => toggle(g.batch.id)}
                      aria-expanded={!isCollapsed}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-playfair text-base font-bold text-cream">
                          {g.batch.title}
                        </span>
                        <span className="block font-inter text-xs text-cream-secondary/60" dir="ltr" style={{ textAlign: "right" }}>
                          {g.batch.batch_date}
                        </span>
                      </span>
                      <ChevronDown
                        size={18}
                        className={cn("shrink-0 text-cream-secondary transition-transform", isCollapsed && "-rotate-90")}
                      />
                    </button>

                    {!isCollapsed && (
                      <div className="overflow-x-auto border-t border-cream/10">
                        {isSales && grouped ? (
                          <OrderTable rows={g.rows} />
                        ) : (
                          <RowsTable rows={g.rows} isSales={isSales} />
                        )}
                        <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-cream/10 bg-bg-primary/40 px-4 py-2 font-inter text-xs text-cream-secondary">
                          {isSales ? (
                            <>
                              <Stat label="القطع المباعة" value={String(g.qty)} />
                              <Stat label="إجمالي المبيعات" value={money(g.total)} strong />
                              <Stat label="الصفوف" value={String(g.rows.length)} />
                            </>
                          ) : (
                            <>
                              <Stat label="إجمالي التكلفة" value={money(g.total)} strong />
                              <Stat label="المدفوع" value={money(g.paid)} />
                              <Stat label="الدين" value={money(g.debt)} warn={g.debt > 0} />
                              <Stat label="الأصناف" value={String(g.rows.length)} />
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 rounded-xl border border-terracotta/30 bg-terracotta/10 px-4 py-2 font-inter text-xs text-cream">
              <span className="font-bold">إجمالي اليوم</span>
              {isSales ? (
                <>
                  <Stat label="القطع" value={String(day.qty)} />
                  <Stat label="المبيعات" value={money(day.total)} strong />
                  <Stat label="الصفوف" value={String(day.rows)} />
                </>
              ) : (
                <>
                  <Stat label="التكلفة" value={money(day.total)} strong />
                  <Stat label="المدفوع" value={money(day.paid)} />
                  <Stat label="الدين" value={money(day.debt)} warn={day.debt > 0} />
                  <Stat label="الأصناف" value={String(day.rows)} />
                </>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, strong, warn }: { label: string; value: string; strong?: boolean; warn?: boolean }) {
  return (
    <span className="whitespace-nowrap">
      <span className="text-cream-secondary/70">{label}: </span>
      <span className={cn(strong && "font-bold text-cream", warn && "text-terracotta-deep")}>{value}</span>
    </span>
  );
}

function RowsTable({ rows, isSales }: { rows: LedgerRow[]; isSales: boolean }) {
  return (
    <table className="w-full min-w-[36rem] text-right font-inter text-sm">
      <thead>
        <tr className="border-b border-cream/10 text-xs text-cream-secondary/60">
          <th className="px-3 py-2 font-medium">الوصف</th>
          <th className="px-3 py-2 font-medium">{isSales ? "الكمية المباعة" : "الكمية"}</th>
          <th className="px-3 py-2 font-medium">{isSales ? "سعر الوحدة" : "تكلفة الوحدة"}</th>
          <th className="px-3 py-2 font-medium">الإجمالي</th>
          {isSales && <th className="px-3 py-2 font-medium">الملاحظات</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-cream/5 text-cream last:border-0">
            <td className="px-3 py-2">{r.description}</td>
            <td className="px-3 py-2">{r.qty}</td>
            <td className="px-3 py-2 whitespace-nowrap">{money(r.unitPrice)}</td>
            <td className={cn("px-3 py-2 whitespace-nowrap font-bold", r.total < 0 && "text-forest")}>{money(r.total)}</td>
            {isSales && <td className="px-3 py-2 text-cream-secondary">{r.notes ?? ""}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OrderTable({ rows }: { rows: LedgerRow[] }) {
  const groups = groupByNote(rows, NO_NOTE);
  return (
    <table className="w-full min-w-[28rem] text-right font-inter text-sm">
      <thead>
        <tr className="border-b border-cream/10 text-xs text-cream-secondary/60">
          <th className="px-3 py-2 font-medium">الطلبية / الزبون</th>
          <th className="px-3 py-2 font-medium">الصفوف</th>
          <th className="px-3 py-2 font-medium">القطع</th>
          <th className="px-3 py-2 font-medium">الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        {groups.map((o) => (
          <tr key={o.key} className="border-b border-cream/5 text-cream last:border-0">
            <td className="px-3 py-2">{o.key}</td>
            <td className="px-3 py-2">{o.rows}</td>
            <td className="px-3 py-2">{o.qty}</td>
            <td className="px-3 py-2 whitespace-nowrap font-bold">{money(o.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Tile({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "debt" | "clear" }) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        tone === "debt" ? "border-terracotta-deep/30 bg-terracotta-deep/10" : "border-cream/10 bg-bg-secondary"
      )}
    >
      <p className="font-inter text-xs uppercase tracking-widest text-cream-secondary/50">{label}</p>
      <p
        className={cn(
          "mt-1 font-playfair text-xl font-bold",
          tone === "debt" ? "text-terracotta-deep" : tone === "clear" ? "text-forest" : "text-cream"
        )}
      >
        {value}
      </p>
    </div>
  );
}
