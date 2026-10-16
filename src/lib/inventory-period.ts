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

/** Flat purchase or sale rows for batches inside the period, newest first. */
export function ledgerRows(
  batches: InventoryBatchWithEntries[],
  range: PeriodRange,
  view: "purchases" | "sales"
): LedgerRow[] {
  const rows: LedgerRow[] = [];
  for (const batch of batches) {
    if (!inRange(batch.batch_date, range)) continue;
    for (const e of batch.inventory_log) {
      const qty = view === "purchases" ? e.quantity : e.quantity_sold;
      const unitPrice = view === "purchases" ? e.unit_cost : (e.unit_sale_price ?? 0);
      const totalCents = qty * toCents(unitPrice);
      if (view === "purchases" ? totalCents === 0 : e.quantity_sold <= 0) continue;
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

export interface OrderGroup {
  key: string;
  rows: number;
  qty: number;
  total: number;
}

/** Sales grouped by the row note (customer/order); rows without a note are
 * collected under one "no note" group. */
export function groupByNote(rows: LedgerRow[], emptyLabel: string): OrderGroup[] {
  const map = new Map<string, { rows: number; qty: number; cents: number }>();
  for (const r of rows) {
    const key = r.notes?.trim() || emptyLabel;
    const g = map.get(key) ?? { rows: 0, qty: 0, cents: 0 };
    g.rows += 1;
    g.qty += r.qty;
    g.cents += toCents(r.total);
    map.set(key, g);
  }
  return [...map.entries()]
    .map(([key, g]) => ({ key, rows: g.rows, qty: g.qty, total: g.cents / 100 }))
    .sort((a, b) => b.total - a.total);
}

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
