import type { InventoryBatchWithEntries, SaleWithItems } from "@/lib/supabase/types";

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
  salesCount: number; // orders in the period
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

/** Sales are read from the `sales` table only (the single source of truth);
 * batches contribute purchases, paid and debt. */
function inRangeDate(date: string, range: PeriodRange): boolean {
  return (!range.from || date >= range.from) && (!range.to || date <= range.to);
}

export function salesInRange(sales: SaleWithItems[], range: PeriodRange): SaleWithItems[] {
  return sales.filter((s) => inRangeDate(s.sale_date, range));
}

export const salesTotal = (sales: SaleWithItems[]): number =>
  sales.reduce((s, x) => s + toCents(x.total_try), 0) / 100;

export const salesQty = (sales: SaleWithItems[]): number =>
  sales.reduce((s, x) => s + x.sale_items.reduce((q, i) => q + Number(i.quantity), 0), 0);

export interface SaleDayGroup {
  date: string;
  sales: SaleWithItems[];
  total: number;
  qty: number;
}

/** Newest day first; orders inside a day newest first. */
export function groupSalesByDay(sales: SaleWithItems[]): SaleDayGroup[] {
  const days = new Map<string, SaleWithItems[]>();
  for (const s of sales) days.set(s.sale_date, [...(days.get(s.sale_date) ?? []), s]);
  return [...days.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, list]) => ({
      date,
      sales: [...list].sort((a, b) => b.created_at.localeCompare(a.created_at)),
      total: salesTotal(list),
      qty: salesQty(list),
    }));
}

export function summarizePeriod(
  batches: InventoryBatchWithEntries[],
  range: PeriodRange,
  allSales: SaleWithItems[]
): PeriodSummary {
  const inRange = batches.filter(
    (b) => (!range.from || b.batch_date >= range.from) && (!range.to || b.batch_date <= range.to)
  );

  const rows: PeriodBatchTotals[] = inRange.map((batch) => {
    let purchases = 0;
    for (const e of batch.inventory_log) {
      purchases += e.quantity * toCents(e.unit_cost);
    }
    const paid = toCents(batch.amount_paid);
    return {
      batch,
      items: batch.inventory_log.length,
      purchases: purchases / 100,
      paid: paid / 100,
      debt: Math.max(purchases - paid, 0) / 100,
    };
  });

  const sum = (pick: (r: PeriodBatchTotals) => number) =>
    rows.reduce((s, r) => s + toCents(pick(r)), 0) / 100;
  const purchases = sum((r) => r.purchases);
  const periodSales = salesInRange(allSales, range);
  const sales = salesTotal(periodSales);

  return {
    batches: rows,
    itemCount: rows.reduce((s, r) => s + r.items, 0),
    purchases,
    sales,
    paid: sum((r) => r.paid),
    debt: sum((r) => r.debt),
    salesCount: periodSales.length,
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

export type InventoryView = "all" | "purchases" | "sales";

export function parseViewParam(value: string | null | undefined): InventoryView {
  return value === "purchases" || value === "sales" ? value : "all";
}

export interface LedgerRow {
  id: string;
  batchId: string;
  date: string;
  batchTitle: string;
  description: string;
  qty: number;
  unitPrice: number; // unit_cost (purchases) or unit_sale_price (sales)
  total: number;
  notes: string | null;
}

function inRange(date: string, range: PeriodRange): boolean {
  return (!range.from || date >= range.from) && (!range.to || date <= range.to);
}

/** Flat purchase rows for batches inside the period, newest first. */
export function ledgerRows(
  batches: InventoryBatchWithEntries[],
  range: PeriodRange
): LedgerRow[] {
  const rows: LedgerRow[] = [];
  for (const batch of batches) {
    if (!inRange(batch.batch_date, range)) continue;
    for (const e of batch.inventory_log) {
      const qty = e.quantity;
      const unitPrice = e.unit_cost;
      const totalCents = qty * toCents(unitPrice);
      if (totalCents === 0) continue;
      rows.push({
        id: e.id,
        batchId: batch.id,
        date: batch.batch_date,
        batchTitle: batch.title,
        description: e.item_description,
        qty,
        unitPrice,
        total: totalCents / 100,
        notes: e.notes,
      });
    }
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

export const sumRows = (rows: LedgerRow[]): number =>
  rows.reduce((s, r) => s + toCents(r.total), 0) / 100;

export interface BatchGroup {
  batch: InventoryBatchWithEntries;
  rows: LedgerRow[];
  total: number;
  qty: number;
  paid: number;
  debt: number;
}

export interface DayGroup {
  date: string;
  batches: BatchGroup[];
  total: number;
  qty: number;
  rows: number;
  paid: number;
  debt: number;
}

/** date (newest first) → batch (newest first) → rows. Batch `debt` is its
 * full cost minus paid (floored at 0), same definition as the all-time view. */
export function groupByDayAndBatch(
  rows: LedgerRow[],
  batches: InventoryBatchWithEntries[]
): DayGroup[] {
  const byId = new Map(batches.map((b) => [b.id, b]));
  const perBatch = new Map<string, LedgerRow[]>();
  for (const r of rows) {
    const list = perBatch.get(r.batchId) ?? [];
    list.push(r);
    perBatch.set(r.batchId, list);
  }

  const days = new Map<string, BatchGroup[]>();
  for (const [id, list] of perBatch) {
    const batch = byId.get(id)!;
    const cost = batch.inventory_log.reduce((s, e) => s + e.quantity * toCents(e.unit_cost), 0);
    const paid = toCents(batch.amount_paid);
    const group: BatchGroup = {
      batch,
      rows: list,
      total: sumRows(list),
      qty: list.reduce((s, r) => s + r.qty, 0),
      paid: paid / 100,
      debt: Math.max(cost - paid, 0) / 100,
    };
    days.set(batch.batch_date, [...(days.get(batch.batch_date) ?? []), group]);
  }

  return [...days.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, groups]) => {
      groups.sort((a, b) => b.batch.created_at.localeCompare(a.batch.created_at));
      const c = (pick: (g: BatchGroup) => number) =>
        groups.reduce((s, g) => s + toCents(pick(g)), 0) / 100;
      return {
        date,
        batches: groups,
        total: c((g) => g.total),
        qty: groups.reduce((s, g) => s + g.qty, 0),
        rows: groups.reduce((s, g) => s + g.rows.length, 0),
        paid: c((g) => g.paid),
        debt: c((g) => g.debt),
      };
    });
}
