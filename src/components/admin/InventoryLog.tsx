"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import {
  createInventoryBatch,
  createInventoryEntry,
  deleteInventoryEntry,
  updateInventoryBatch,
  updateInventoryEntry,
} from "@/actions/inventory";
import { cn } from "@/lib/cn";
import type {
  InventoryBatchWithEntries,
  InventoryEntryRow,
  InventoryStatus,
} from "@/lib/supabase/types";

const STATUS_LABELS: Record<InventoryStatus, string> = {
  in_stock: "متوفر بالمخزن",
  sold_out: "مباع بالكامل",
  partially_sold: "مباع جزئيًا",
};

const STATUS_BADGE_CLASSES: Record<InventoryStatus, string> = {
  in_stock: "bg-forest/15 text-forest",
  sold_out: "bg-cream/10 text-cream-secondary",
  partially_sold: "bg-terracotta/15 text-terracotta",
};

interface FieldsState {
  batch_id: string;
  entry_date: string;
  item_description: string;
  quantity: string;
  unit_cost: string;
  status: InventoryStatus;
  quantity_sold: string;
  unit_sale_price: string;
  last_sale_date: string;
  notes: string;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyFields(batchId: string, batchDate: string): FieldsState {
  return {
    batch_id: batchId,
    entry_date: batchDate || todayISO(),
    item_description: "",
    quantity: "",
    unit_cost: "",
    status: "in_stock",
    quantity_sold: "0",
    unit_sale_price: "",
    last_sale_date: "",
    notes: "",
  };
}

function fieldsFromEntry(entry: InventoryEntryRow): FieldsState {
  return {
    batch_id: entry.batch_id,
    entry_date: entry.entry_date,
    item_description: entry.item_description,
    quantity: String(entry.quantity),
    unit_cost: String(entry.unit_cost),
    status: entry.status,
    quantity_sold: String(entry.quantity_sold),
    unit_sale_price: entry.unit_sale_price != null ? String(entry.unit_sale_price) : "",
    last_sale_date: entry.last_sale_date ?? "",
    notes: entry.notes ?? "",
  };
}

function toFormData(fields: FieldsState): FormData {
  const fd = new FormData();
  fd.set("batch_id", fields.batch_id);
  fd.set("entry_date", fields.entry_date);
  fd.set("item_description", fields.item_description);
  fd.set("quantity", fields.quantity);
  fd.set("unit_cost", fields.unit_cost);
  fd.set("status", fields.status);
  fd.set("quantity_sold", fields.quantity_sold);
  fd.set("unit_sale_price", fields.unit_sale_price);
  fd.set("last_sale_date", fields.last_sale_date);
  fd.set("notes", fields.notes);
  return fd;
}

function num(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function computeTotals(fields: Pick<FieldsState, "quantity" | "unit_cost" | "quantity_sold" | "unit_sale_price">) {
  const quantity = num(fields.quantity);
  const unitCost = num(fields.unit_cost);
  const quantitySold = num(fields.quantity_sold);
  const unitSalePrice = fields.unit_sale_price ? num(fields.unit_sale_price) : 0;

  const totalCost = quantity * unitCost;
  const totalSale = quantitySold * unitSalePrice;
  const profit = totalSale - quantitySold * unitCost;
  return { totalCost, totalSale, profit };
}

function batchCost(batch: InventoryBatchWithEntries): number {
  return batch.inventory_log.reduce((sum, e) => sum + e.quantity * e.unit_cost, 0);
}

function money(n: number): string {
  return `₺ ${n.toLocaleString()}`;
}

const inputClass =
  "w-full rounded-lg border border-cream/20 bg-bg-primary px-2 py-1.5 font-inter text-sm text-cream focus:border-terracotta focus:outline-none";

interface BatchFieldsState {
  title: string;
  batch_date: string;
  amount_paid: string;
}

export function InventoryLog({ batches }: { batches: InventoryBatchWithEntries[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [isAddingBatch, setIsAddingBatch] = useState(false);
  const [newBatchFields, setNewBatchFields] = useState<BatchFieldsState>({
    title: "",
    batch_date: todayISO(),
    amount_paid: "0",
  });

  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [editBatchFields, setEditBatchFields] = useState<BatchFieldsState>({
    title: "",
    batch_date: "",
    amount_paid: "0",
  });

  const [addingRowBatchId, setAddingRowBatchId] = useState<string | null>(null);
  const [newRowFields, setNewRowFields] = useState<FieldsState | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<FieldsState | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<InventoryEntryRow | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<"all" | InventoryStatus>("all");

  const grand = useMemo(() => {
    const acc = { totalCost: 0, totalPaid: 0, totalDebt: 0, totalSale: 0, totalProfit: 0 };
    for (const batch of batches) {
      const cost = batchCost(batch);
      acc.totalCost += cost;
      acc.totalPaid += batch.amount_paid;
      acc.totalDebt += Math.max(cost - batch.amount_paid, 0);
      for (const e of batch.inventory_log) {
        const sale = e.quantity_sold * (e.unit_sale_price ?? 0);
        acc.totalSale += sale;
        acc.totalProfit += sale - e.quantity_sold * e.unit_cost;
      }
    }
    return acc;
  }, [batches]);

  function toggleCollapsed(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startAddBatch() {
    setIsAddingBatch(true);
    setNewBatchFields({ title: "", batch_date: todayISO(), amount_paid: "0" });
    setError(null);
  }

  function handleCreateBatch() {
    setError(null);
    const fd = new FormData();
    fd.set("title", newBatchFields.title);
    fd.set("batch_date", newBatchFields.batch_date);
    fd.set("amount_paid", newBatchFields.amount_paid);
    startTransition(async () => {
      try {
        await createInventoryBatch(fd);
        setIsAddingBatch(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "حدث خطأ ما، حاول مرة أخرى.");
      }
    });
  }

  function startEditBatch(batch: InventoryBatchWithEntries) {
    setEditingBatchId(batch.id);
    setEditBatchFields({
      title: batch.title,
      batch_date: batch.batch_date,
      amount_paid: String(batch.amount_paid),
    });
    setError(null);
  }

  function handleUpdateBatch(id: string) {
    setError(null);
    const fd = new FormData();
    fd.set("title", editBatchFields.title);
    fd.set("batch_date", editBatchFields.batch_date);
    fd.set("amount_paid", editBatchFields.amount_paid);
    startTransition(async () => {
      try {
        await updateInventoryBatch(id, fd);
        setEditingBatchId(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "حدث خطأ ما، حاول مرة أخرى.");
      }
    });
  }

  function startAddRow(batch: InventoryBatchWithEntries) {
    setAddingRowBatchId(batch.id);
    setNewRowFields(emptyFields(batch.id, batch.batch_date));
    setEditingId(null);
    setError(null);
  }

  function handleCreateRow() {
    if (!newRowFields) return;
    setError(null);
    startTransition(async () => {
      try {
        await createInventoryEntry(toFormData(newRowFields));
        setAddingRowBatchId(null);
        setNewRowFields(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "حدث خطأ ما، حاول مرة أخرى.");
      }
    });
  }

  function startEditRow(entry: InventoryEntryRow) {
    setEditingId(entry.id);
    setEditFields(fieldsFromEntry(entry));
    setAddingRowBatchId(null);
    setError(null);
  }

  function handleUpdateRow(original: InventoryEntryRow) {
    if (!editFields) return;
    setError(null);
    const soldChanged = editFields.quantity_sold !== String(original.quantity_sold);
    const dateUntouched = editFields.last_sale_date === (original.last_sale_date ?? "");
    const fields =
      soldChanged && dateUntouched ? { ...editFields, last_sale_date: todayISO() } : editFields;

    startTransition(async () => {
      try {
        await updateInventoryEntry(original.id, toFormData(fields));
        setEditingId(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "حدث خطأ ما، حاول مرة أخرى.");
      }
    });
  }

  async function handleDeleteRow() {
    if (!deleteTarget) return;
    setError(null);
    try {
      await deleteInventoryEntry(deleteTarget.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ ما، حاول مرة أخرى.");
    } finally {
      setDeleteTarget(null);
      router.refresh();
    }
  }

  return (
    <div dir="rtl">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-playfair text-3xl font-bold text-cream">دفتر البضاعة</h1>
          <p className="mt-1 font-inter text-sm text-cream-secondary/60">
            {batches.length} دفعة · {batches.reduce((s, b) => s + b.inventory_log.length, 0)} صنف
          </p>
        </div>
        {!isAddingBatch && (
          <Button variant="primary" onClick={startAddBatch}>
            <Plus size={16} />
            إضافة دفعة جديدة
          </Button>
        )}
      </div>

      {error && <p className="mb-4 font-inter text-sm text-terracotta-deep">{error}</p>}

      {isAddingBatch && (
        <div className="mb-6 rounded-2xl border border-terracotta/30 bg-bg-secondary p-5">
          <h2 className="mb-3 font-playfair text-lg font-bold text-cream">دفعة جديدة</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block font-inter text-xs uppercase tracking-widest text-cream-secondary/50">
                عنوان الدفعة
              </label>
              <input
                type="text"
                required
                value={newBatchFields.title}
                onChange={(e) => setNewBatchFields((f) => ({ ...f, title: e.target.value }))}
                placeholder="مثال: بلايز"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block font-inter text-xs uppercase tracking-widest text-cream-secondary/50">
                التاريخ
              </label>
              <input
                type="date"
                required
                value={newBatchFields.batch_date}
                onChange={(e) => setNewBatchFields((f) => ({ ...f, batch_date: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block font-inter text-xs uppercase tracking-widest text-cream-secondary/50">
                المدفوع مسبقًا (اختياري)
              </label>
              <input
                type="number"
                min={0}
                value={newBatchFields.amount_paid}
                onChange={(e) => setNewBatchFields((f) => ({ ...f, amount_paid: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <Button size="md" disabled={isPending} onClick={handleCreateBatch}>
              حفظ الدفعة
            </Button>
            <Button variant="ghost" size="md" disabled={isPending} onClick={() => setIsAddingBatch(false)}>
              إلغاء
            </Button>
          </div>
        </div>
      )}

      {/* All-time summary across every batch. */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <SummaryTile label="عدد الدفعات" value={String(batches.length)} />
        <SummaryTile label="إجمالي تكلفة البضاعة" value={money(grand.totalCost)} />
        <SummaryTile label="إجمالي المدفوع" value={money(grand.totalPaid)} />
        <SummaryTile
          label="إجمالي الدين المتبقي"
          value={money(grand.totalDebt)}
          tone={grand.totalDebt > 0 ? "debt" : "clear"}
        />
      </div>
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SummaryTile label="إجمالي الإيراد من المبيعات" value={money(grand.totalSale)} />
        <SummaryTile
          label="إجمالي الربح الصافي"
          value={money(grand.totalProfit)}
          tone={grand.totalProfit >= 0 ? "clear" : "debt"}
        />
      </div>

      {/* Status filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["all", "الكل"],
            ["in_stock", STATUS_LABELS.in_stock],
            ["partially_sold", STATUS_LABELS.partially_sold],
            ["sold_out", STATUS_LABELS.sold_out],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatusFilter(value)}
            className={cn(
              "rounded-full border px-4 py-1.5 font-inter text-xs transition-colors",
              statusFilter === value
                ? "border-terracotta bg-terracotta text-cream"
                : "border-cream/20 text-cream-secondary hover:text-cream"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {batches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cream/15 py-24 text-center">
          <p className="font-inter text-cream-secondary/60">لا توجد دفعات بعد.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {batches.map((batch) => {
            const rows =
              statusFilter === "all"
                ? batch.inventory_log
                : batch.inventory_log.filter((e) => e.status === statusFilter);
            if (rows.length === 0 && statusFilter !== "all") return null;

            const cost = batchCost(batch);
            const debt = Math.max(cost - batch.amount_paid, 0);
            const isCollapsed = collapsed.has(batch.id);
            const isEditingBatch = editingBatchId === batch.id;

            return (
              <section key={batch.id} className="overflow-hidden rounded-2xl border border-cream/10">
                <div className="flex flex-col gap-3 bg-bg-secondary p-5 sm:flex-row sm:items-center sm:justify-between">
                  {isEditingBatch ? (
                    <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                      <input
                        type="text"
                        required
                        value={editBatchFields.title}
                        onChange={(e) => setEditBatchFields((f) => ({ ...f, title: e.target.value }))}
                        className={inputClass}
                      />
                      <input
                        type="date"
                        required
                        value={editBatchFields.batch_date}
                        onChange={(e) => setEditBatchFields((f) => ({ ...f, batch_date: e.target.value }))}
                        className={inputClass}
                      />
                      <input
                        type="number"
                        min={0}
                        value={editBatchFields.amount_paid}
                        onChange={(e) => setEditBatchFields((f) => ({ ...f, amount_paid: e.target.value }))}
                        className={inputClass}
                        placeholder="المدفوع"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleCollapsed(batch.id)}
                      className="flex flex-1 items-center gap-3 text-start"
                    >
                      <ChevronDown
                        size={16}
                        className={cn(
                          "shrink-0 text-cream-secondary/50 transition-transform",
                          isCollapsed && "-rotate-90"
                        )}
                      />
                      <div>
                        <h2 className="font-playfair text-lg font-bold text-cream">{batch.title}</h2>
                        <p className="mt-0.5 font-inter text-xs text-cream-secondary/60">
                          {batch.batch_date} · {rows.length} صنف · تكلفة {money(cost)} · مدفوع {money(batch.amount_paid)}
                        </p>
                      </div>
                    </button>
                  )}

                  <div className="flex items-center gap-3">
                    {!isEditingBatch && (
                      <span
                        className={cn(
                          "whitespace-nowrap rounded-full px-3 py-1.5 font-inter text-xs font-semibold",
                          debt > 0
                            ? "bg-terracotta-deep/15 text-terracotta-deep"
                            : "bg-forest/15 text-forest"
                        )}
                      >
                        {debt > 0 ? `دين متبقٍ: ${money(debt)}` : "مسددة بالكامل"}
                      </span>
                    )}
                    {isEditingBatch ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateBatch(batch.id)}
                          disabled={isPending}
                          aria-label="حفظ الدفعة"
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-forest/40 text-forest transition-colors hover:bg-forest/10"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingBatchId(null)}
                          disabled={isPending}
                          aria-label="إلغاء"
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-cream/15 text-cream-secondary transition-colors hover:bg-cream/5"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditBatch(batch)}
                        aria-label="تعديل الدفعة"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cream/15 text-cream-secondary transition-colors hover:border-forest hover:text-forest"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="border-t border-cream/10 p-4">
                    <div className="mb-3 flex justify-end">
                      <Button size="md" variant="secondary" onClick={() => startAddRow(batch)}>
                        <Plus size={14} />
                        إضافة صنف
                      </Button>
                    </div>
                    <div className="table-scroll overflow-x-auto rounded-xl border border-cream/10">
                      <table className="w-full min-w-[1500px] border-collapse text-start">
                        <thead>
                          <tr className="border-b border-cream/10 bg-bg-primary">
                            {[
                              "التاريخ",
                              "البضاعة / الوصف",
                              "الكمية",
                              "سعر الجلب/وحدة",
                              "إجمالي الجلب",
                              "الحالة",
                              "الكمية المباعة",
                              "سعر البيع/وحدة",
                              "إجمالي البيع",
                              "الربح",
                              "تاريخ آخر بيع",
                              "ملاحظات",
                              "إجراءات",
                            ].map((col) => (
                              <th
                                key={col}
                                className="whitespace-nowrap px-4 py-2.5 text-start font-inter text-[11px] uppercase tracking-widest text-cream-secondary/60"
                              >
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {addingRowBatchId === batch.id && newRowFields && (
                            <EditableRow
                              fields={newRowFields}
                              onChange={setNewRowFields}
                              onSave={handleCreateRow}
                              onCancel={() => {
                                setAddingRowBatchId(null);
                                setNewRowFields(null);
                              }}
                              saving={isPending}
                            />
                          )}
                          {rows.length === 0 && addingRowBatchId !== batch.id ? (
                            <tr>
                              <td colSpan={13} className="px-4 py-10 text-center font-inter text-cream-secondary/60">
                                لا توجد أصناف بهاي الدفعة.
                              </td>
                            </tr>
                          ) : (
                            rows.map((entry) =>
                              editingId === entry.id && editFields ? (
                                <EditableRow
                                  key={entry.id}
                                  fields={editFields}
                                  onChange={setEditFields}
                                  onSave={() => handleUpdateRow(entry)}
                                  onCancel={() => setEditingId(null)}
                                  saving={isPending}
                                />
                              ) : (
                                <DisplayRow
                                  key={entry.id}
                                  entry={entry}
                                  onEdit={() => startEditRow(entry)}
                                  onDelete={() => setDeleteTarget(entry)}
                                />
                              )
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          description={deleteTarget.item_description}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteRow}
        />
      )}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "debt" | "clear";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        tone === "debt"
          ? "border-terracotta-deep/30 bg-terracotta-deep/10"
          : "border-cream/10 bg-bg-secondary"
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

function DisplayRow({
  entry,
  onEdit,
  onDelete,
}: {
  entry: InventoryEntryRow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { totalCost, totalSale, profit } = computeTotals({
    quantity: String(entry.quantity),
    unit_cost: String(entry.unit_cost),
    quantity_sold: String(entry.quantity_sold),
    unit_sale_price: entry.unit_sale_price != null ? String(entry.unit_sale_price) : "",
  });

  return (
    <tr className="border-b border-cream/5 last:border-0 hover:bg-cream/[0.02]">
      <td className="whitespace-nowrap px-4 py-3 font-inter text-sm text-cream-secondary/80">
        {entry.entry_date}
      </td>
      <td className="max-w-xs px-4 py-3 font-inter text-sm text-cream">{entry.item_description}</td>
      <td className="px-4 py-3 font-inter text-sm text-cream-secondary/80">{entry.quantity}</td>
      <td className="whitespace-nowrap px-4 py-3 font-inter text-sm text-cream-secondary/80">
        {money(entry.unit_cost)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 font-inter text-sm text-cream">{money(totalCost)}</td>
      <td className="px-4 py-3">
        <span
          className={cn(
            "whitespace-nowrap rounded-full px-3 py-1 font-inter text-xs",
            STATUS_BADGE_CLASSES[entry.status]
          )}
        >
          {STATUS_LABELS[entry.status]}
        </span>
      </td>
      <td className="px-4 py-3 font-inter text-sm text-cream-secondary/80">{entry.quantity_sold}</td>
      <td className="whitespace-nowrap px-4 py-3 font-inter text-sm text-cream-secondary/80">
        {entry.unit_sale_price != null ? money(entry.unit_sale_price) : "—"}
      </td>
      <td className="whitespace-nowrap px-4 py-3 font-inter text-sm text-cream">{money(totalSale)}</td>
      <td
        className={cn(
          "whitespace-nowrap px-4 py-3 font-inter text-sm font-semibold",
          profit >= 0 ? "text-forest" : "text-terracotta-deep"
        )}
      >
        {money(profit)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 font-inter text-sm text-cream-secondary/80">
        {entry.last_sale_date ?? "—"}
      </td>
      <td className="max-w-[12rem] truncate px-4 py-3 font-inter text-sm text-cream-secondary/60" title={entry.notes ?? ""}>
        {entry.notes ?? "—"}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            aria-label="تعديل"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-cream/15 text-cream-secondary transition-colors hover:border-forest hover:text-forest"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="حذف"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-cream/15 text-cream-secondary transition-colors hover:border-terracotta-deep hover:text-terracotta-deep"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function EditableRow({
  fields,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  fields: FieldsState;
  onChange: (fields: FieldsState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const { totalCost, totalSale, profit } = computeTotals(fields);

  function set<K extends keyof FieldsState>(key: K, value: FieldsState[K]) {
    onChange({ ...fields, [key]: value });
  }

  return (
    <tr className="border-b border-cream/10 bg-terracotta/5">
      <td className="px-4 py-2">
        <input
          type="date"
          required
          value={fields.entry_date}
          onChange={(e) => set("entry_date", e.target.value)}
          className={cn(inputClass, "w-36")}
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="text"
          required
          value={fields.item_description}
          onChange={(e) => set("item_description", e.target.value)}
          placeholder="مثال: 20 قطعة شال حطة دفعة جديدة"
          className={cn(inputClass, "w-56")}
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="number"
          min={0}
          required
          value={fields.quantity}
          onChange={(e) => set("quantity", e.target.value)}
          className={cn(inputClass, "w-20")}
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="number"
          min={0}
          step="0.01"
          required
          value={fields.unit_cost}
          onChange={(e) => set("unit_cost", e.target.value)}
          className={cn(inputClass, "w-24")}
        />
      </td>
      <td className="whitespace-nowrap px-4 py-2 font-inter text-sm text-cream-secondary/70">
        {money(totalCost)}
      </td>
      <td className="px-4 py-2">
        <select
          value={fields.status}
          onChange={(e) => set("status", e.target.value as InventoryStatus)}
          className={cn(inputClass, "w-36")}
        >
          <option value="in_stock" className="bg-bg-primary">
            {STATUS_LABELS.in_stock}
          </option>
          <option value="partially_sold" className="bg-bg-primary">
            {STATUS_LABELS.partially_sold}
          </option>
          <option value="sold_out" className="bg-bg-primary">
            {STATUS_LABELS.sold_out}
          </option>
        </select>
      </td>
      <td className="px-4 py-2">
        <input
          type="number"
          min={0}
          value={fields.quantity_sold}
          onChange={(e) => set("quantity_sold", e.target.value)}
          className={cn(inputClass, "w-20")}
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="number"
          min={0}
          step="0.01"
          value={fields.unit_sale_price}
          onChange={(e) => set("unit_sale_price", e.target.value)}
          className={cn(inputClass, "w-24")}
        />
      </td>
      <td className="whitespace-nowrap px-4 py-2 font-inter text-sm text-cream-secondary/70">
        {money(totalSale)}
      </td>
      <td
        className={cn(
          "whitespace-nowrap px-4 py-2 font-inter text-sm font-semibold",
          profit >= 0 ? "text-forest" : "text-terracotta-deep"
        )}
      >
        {money(profit)}
      </td>
      <td className="px-4 py-2">
        <input
          type="date"
          value={fields.last_sale_date}
          onChange={(e) => set("last_sale_date", e.target.value)}
          className={cn(inputClass, "w-36")}
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="text"
          value={fields.notes}
          onChange={(e) => set("notes", e.target.value)}
          className={cn(inputClass, "w-40")}
        />
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            aria-label="حفظ"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-forest/40 text-forest transition-colors hover:bg-forest/10 disabled:opacity-50"
          >
            <Check size={16} />
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            aria-label="إلغاء"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-cream/15 text-cream-secondary transition-colors hover:bg-cream/5 disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function ConfirmDeleteDialog({
  description,
  onCancel,
  onConfirm,
}: {
  description: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      await onConfirm();
    });
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary/80 px-6 backdrop-blur-sm"
        onClick={onCancel}
        dir="rtl"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl border border-cream/10 bg-bg-secondary p-6"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-terracotta-deep/15 text-terracotta-deep">
            <AlertTriangle size={22} />
          </div>
          <h2 className="font-playfair text-xl font-bold text-cream">حذف الصنف</h2>
          <p className="mt-2 font-inter text-sm text-cream-secondary/75">
            هل أنت متأكد من حذف &quot;{description}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" size="md" onClick={onCancel} disabled={isPending}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleConfirm}
              disabled={isPending}
              className="!bg-terracotta-deep hover:!bg-[#8f1b25]"
            >
              نعم، احذف
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
