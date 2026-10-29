"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  groupByDayAndBatch,
  groupSalesByDay,
  ledgerRows,
  salesInRange,
  sumRows,
  summarizePeriod,
  type LedgerRow,
  type PeriodRange,
} from "@/lib/inventory-period";
import type { InventoryBatchWithEntries, SaleWithItems } from "@/lib/supabase/types";

const money = (n: number) => `₺ ${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

/** Purchases (from ledger batches) and sales (from the `sales` table) views,
 * honouring the period filter. */
export function InventoryLedgerView({
  batches,
  sales,
  range,
  view,
}: {
  batches: InventoryBatchWithEntries[];
  sales: SaleWithItems[];
  range: PeriodRange;
  view: "purchases" | "sales";
}) {
  return view === "sales" ? (
    <SalesView batches={batches} sales={sales} range={range} />
  ) : (
    <PurchasesView batches={batches} range={range} />
  );
}

function useCollapsed() {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return { collapsed, toggle };
}

function SalesView({
  batches,
  sales,
  range,
}: {
  batches: InventoryBatchWithEntries[];
  sales: SaleWithItems[];
  range: PeriodRange;
}) {
  const { collapsed, toggle } = useCollapsed();
  const period = useMemo(() => summarizePeriod(batches, range, sales), [batches, range, sales]);
  const days = useMemo(() => groupSalesByDay(salesInRange(sales, range)), [sales, range]);
  const qty = days.reduce((s, d) => s + d.qty, 0);

  if (period.salesCount === 0) {
    return (
      <p className="mb-6 rounded-2xl border border-dashed border-cream/15 py-12 text-center font-inter text-sm text-cream-secondary/60">
        ما في بيانات بالفترة
      </p>
    );
  }

  return (
    <div className="mb-6">
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <Tile label="إجمالي المبيعات" value={money(period.sales)} tone="clear" />
        <Tile label="عدد القطع المباعة" value={qty.toLocaleString("en-US")} />
        <Tile label="عدد الطلبات" value={String(period.salesCount)} />
        <Tile label="متوسط قيمة الطلب" value={money(Math.round((period.sales / period.salesCount) * 100) / 100)} />
        <Tile label="المشتريات" value={money(period.purchases)} />
        <div className="col-span-2 sm:col-span-4 lg:col-span-5">
          <Tile
            label="الصافي: مبيعات − مشتريات"
            value={money(period.net)}
            tone={period.net >= 0 ? "clear" : "debt"}
          />
        </div>
      </div>

      <div className="space-y-6">
        {days.map((day) => (
          <section key={day.date}>
            <h3 className="mb-2 font-playfair text-base font-bold text-cream" dir="ltr" style={{ textAlign: "right" }}>
              {day.date}
            </h3>
            <div className="space-y-3">
              {day.sales.map((sale) => {
                const isCollapsed = collapsed.has(sale.id);
                return (
                  <div key={sale.id} className="overflow-hidden rounded-2xl border border-cream/10 bg-bg-secondary">
                    <button
                      type="button"
                      onClick={() => toggle(sale.id)}
                      aria-expanded={!isCollapsed}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-playfair text-base font-bold text-cream">
                          {sale.sale_items.map((i) => i.item_name).join(" + ")}
                        </span>
                        {sale.notes && (
                          <span className="block truncate font-inter text-xs text-cream-secondary/60">{sale.notes}</span>
                        )}
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="font-inter text-sm font-bold text-cream">{money(Number(sale.total_try))}</span>
                        <ChevronDown
                          size={18}
                          className={cn("text-cream-secondary transition-transform", isCollapsed && "-rotate-90")}
                        />
                      </span>
                    </button>
                    {!isCollapsed && (
                      <div className="overflow-x-auto border-t border-cream/10">
                        <table className="w-full min-w-[28rem] text-right font-inter text-sm">
                          <thead>
                            <tr className="border-b border-cream/10 text-xs text-cream-secondary/60">
                              <th className="px-3 py-2 font-medium">الصنف</th>
                              <th className="px-3 py-2 font-medium">الكمية</th>
                              <th className="px-3 py-2 font-medium">سعر الوحدة</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sale.sale_items.map((i) => (
                              <tr key={i.id} className="border-b border-cream/5 text-cream last:border-0">
                                <td className="px-3 py-2">{i.item_name}</td>
                                <td className="px-3 py-2">{Number(i.quantity)}</td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  {i.unit_price != null ? money(Number(i.unit_price)) : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 rounded-xl border border-terracotta/30 bg-terracotta/10 px-4 py-2 font-inter text-xs text-cream">
              <span className="font-bold">إجمالي اليوم</span>
              <Stat label="القطع" value={String(day.qty)} />
              <Stat label="المبيعات" value={money(day.total)} strong />
              <Stat label="الطلبات" value={String(day.sales.length)} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function PurchasesView({ batches, range }: { batches: InventoryBatchWithEntries[]; range: PeriodRange }) {
  const { collapsed, toggle } = useCollapsed();
  const rows = useMemo(() => ledgerRows(batches, range), [batches, range]);
  const total = useMemo(() => sumRows(rows), [rows]);
  const period = useMemo(() => summarizePeriod(batches, range, []), [batches, range]);
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

  return (
    <div className="mb-6">
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <Tile label="إجمالي المشتريات" value={money(total)} />
        <Tile label="المدفوع" value={money(purchaseBatches.reduce((s, b) => s + b.paid, 0))} />
        <Tile
          label="الدين"
          value={money(purchaseBatches.reduce((s, b) => s + b.debt, 0))}
          tone={purchaseBatches.some((b) => b.debt > 0) ? "debt" : "clear"}
        />
        <Tile label="عدد الدفعات" value={String(purchaseBatches.length)} />
        <Tile label="عدد الأصناف" value={String(rows.length)} />
      </div>

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
                        <RowsTable rows={g.rows} />
                        <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-cream/10 bg-bg-primary/40 px-4 py-2 font-inter text-xs text-cream-secondary">
                          <Stat label="إجمالي التكلفة" value={money(g.total)} strong />
                          <Stat label="المدفوع" value={money(g.paid)} />
                          <Stat label="الدين" value={money(g.debt)} warn={g.debt > 0} />
                          <Stat label="الأصناف" value={String(g.rows.length)} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 rounded-xl border border-terracotta/30 bg-terracotta/10 px-4 py-2 font-inter text-xs text-cream">
              <span className="font-bold">إجمالي اليوم</span>
              <Stat label="التكلفة" value={money(day.total)} strong />
              <Stat label="المدفوع" value={money(day.paid)} />
              <Stat label="الدين" value={money(day.debt)} warn={day.debt > 0} />
              <Stat label="الأصناف" value={String(day.rows)} />
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

function RowsTable({ rows }: { rows: LedgerRow[] }) {
  return (
    <table className="w-full min-w-[36rem] text-right font-inter text-sm">
      <thead>
        <tr className="border-b border-cream/10 text-xs text-cream-secondary/60">
          <th className="px-3 py-2 font-medium">الوصف</th>
          <th className="px-3 py-2 font-medium">الكمية</th>
          <th className="px-3 py-2 font-medium">تكلفة الوحدة</th>
          <th className="px-3 py-2 font-medium">الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-cream/5 text-cream last:border-0">
            <td className="px-3 py-2">{r.description}</td>
            <td className="px-3 py-2">{r.qty}</td>
            <td className="px-3 py-2 whitespace-nowrap">{money(r.unitPrice)}</td>
            <td className={cn("px-3 py-2 whitespace-nowrap font-bold", r.total < 0 && "text-forest")}>{money(r.total)}</td>
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
