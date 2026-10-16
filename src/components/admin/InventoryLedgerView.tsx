"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import {
  groupByNote,
  ledgerRows,
  sumRows,
  summarizePeriod,
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
  const isSales = view === "sales";

  const rows = useMemo(() => ledgerRows(batches, range, view), [batches, range, view]);
  const total = useMemo(() => sumRows(rows), [rows]);
  const period = useMemo(() => summarizePeriod(batches, range), [batches, range]);
  const purchaseBatches = useMemo(() => {
    const ids = new Set(rows.map((r) => r.batchId));
    return period.batches.filter((b) => ids.has(b.batch.id));
  }, [rows, period]);
  const groups = useMemo(() => (isSales ? groupByNote(rows, NO_NOTE) : []), [rows, isSales]);

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

      <div className="overflow-x-auto rounded-2xl border border-cream/10 bg-bg-secondary">
        {isSales && grouped ? (
          <table className="w-full min-w-[28rem] text-right font-inter text-sm">
            <thead>
              <tr className="border-b border-cream/10 text-xs text-cream-secondary/60">
                <th className="px-3 py-2 font-medium">الطلبية / الزبون</th>
                <th className="px-3 py-2 font-medium">عدد الصفوف</th>
                <th className="px-3 py-2 font-medium">القطع</th>
                <th className="px-3 py-2 font-medium">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.key} className="border-b border-cream/5 text-cream last:border-0">
                  <td className="px-3 py-2">{g.key}</td>
                  <td className="px-3 py-2">{g.rows}</td>
                  <td className="px-3 py-2">{g.qty}</td>
                  <td className="px-3 py-2 whitespace-nowrap font-bold">{money(g.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[40rem] text-right font-inter text-sm">
            <thead>
              <tr className="border-b border-cream/10 text-xs text-cream-secondary/60">
                <th className="px-3 py-2 font-medium">التاريخ</th>
                <th className="px-3 py-2 font-medium">الدفعة</th>
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
                  <td className="px-3 py-2 whitespace-nowrap" dir="ltr">{r.date}</td>
                  <td className="px-3 py-2">{r.batchTitle}</td>
                  <td className="px-3 py-2">{r.description}</td>
                  <td className="px-3 py-2">{r.qty}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{money(r.unitPrice)}</td>
                  <td className="px-3 py-2 whitespace-nowrap font-bold">{money(r.total)}</td>
                  {isSales && <td className="px-3 py-2 text-cream-secondary">{r.notes ?? ""}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
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
