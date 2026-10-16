import type { InventoryBatchWithEntries } from "@/lib/supabase/types";

// All money math runs in integer cents: unit_cost / unit_sale_price are
// numeric(10,2), so 0.1 + 0.2 style float drift never leaks into totals.
const toCents = (n: number): number => Math.round(n * 100);

export interface PeriodRange {
  from: string | null; // "YYYY-MM-DD", inclusive
  to: string | null; // "YYYY-MM-DD", inclusive
}

export interface PeriodBatchTotals {
  batch: InventoryBatchWithEntries;
  items: number;
  purchases: number;
  sales: number;
  paid: number;
  debt: number;
}

export interface PeriodSummary {
  batches: PeriodBatchTotals[];
  itemCount: number;
  purchases: number;
  sales: number;
  paid: number;
  debt: number;
  net: number; // sales − purchases
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseDateParam(value: string | null | undefined): string | null {
  if (!value || !ISO_DATE.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value ? null : value;
}

export function isFiltered(range: PeriodRange): boolean {
  return range.from !== null || range.to !== null;
}

export function summarizePeriod(
  batches: InventoryBatchWithEntries[],
  range: PeriodRange
): PeriodSummary {
  const inRange = batches.filter(
    (b) => (!range.from || b.batch_date >= range.from) && (!range.to || b.batch_date <= range.to)
  );

  const rows: PeriodBatchTotals[] = inRange.map((batch) => {
    let purchases = 0;
    let sales = 0;
    for (const e of batch.inventory_log) {
      purchases += e.quantity * toCents(e.unit_cost);
      sales += e.quantity_sold * toCents(e.unit_sale_price ?? 0);
    }
    const paid = toCents(batch.amount_paid);
    return {
      batch,
      items: batch.inventory_log.length,
      purchases: purchases / 100,
      sales: sales / 100,
      paid: paid / 100,
      debt: Math.max(purchases - paid, 0) / 100,
    };
  });

  const sum = (pick: (r: PeriodBatchTotals) => number) =>
    rows.reduce((s, r) => s + toCents(pick(r)), 0) / 100;
  const purchases = sum((r) => r.purchases);
  const sales = sum((r) => r.sales);

  return {
    batches: rows,
    itemCount: rows.reduce((s, r) => s + r.items, 0),
    purchases,
    sales,
    paid: sum((r) => r.paid),
    debt: sum((r) => r.debt),
    net: (toCents(sales) - toCents(purchases)) / 100,
  };
}

function iso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export type PeriodPreset = "today" | "last7" | "thisMonth" | "lastMonth" | "last30" | "all";

export function presetRange(preset: PeriodPreset, now = new Date()): PeriodRange {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysAgo = (n: number) => new Date(day.getFullYear(), day.getMonth(), day.getDate() - n);
  switch (preset) {
    case "today":
      return { from: iso(day), to: iso(day) };
    case "last7":
      return { from: iso(daysAgo(6)), to: iso(day) };
    case "last30":
      return { from: iso(daysAgo(29)), to: iso(day) };
    case "thisMonth":
      return { from: iso(new Date(day.getFullYear(), day.getMonth(), 1)), to: iso(day) };
    case "lastMonth":
      return {
        from: iso(new Date(day.getFullYear(), day.getMonth() - 1, 1)),
        to: iso(new Date(day.getFullYear(), day.getMonth(), 0)),
      };
    case "all":
      return { from: null, to: null };
  }
}
