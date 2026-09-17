"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import {
  createInventoryEntry,
  deleteInventoryEntry,
  updateInventoryEntry,
} from "@/actions/inventory";
import { cn } from "@/lib/cn";
import type { InventoryEntryRow, InventoryStatus } from "@/lib/supabase/types";

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

const EMPTY_FIELDS: FieldsState = {
  entry_date: todayISO(),
  item_description: "",
  quantity: "",
  unit_cost: "",
  status: "in_stock",
  quantity_sold: "0",
  unit_sale_price: "",
  last_sale_date: "",
  notes: "",
};

function fieldsFromEntry(entry: InventoryEntryRow): FieldsState {
  return {
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

function money(n: number): string {
  return `₺ ${n.toLocaleString()}`;
}

const inputClass =
  "w-full rounded-lg border border-cream/20 bg-bg-primary px-2 py-1.5 font-inter text-sm text-cream focus:border-terracotta focus:outline-none";

export function InventoryLog({ entries }: { entries: InventoryEntryRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [newFields, setNewFields] = useState<FieldsState>(EMPTY_FIELDS);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<FieldsState>(EMPTY_FIELDS);

  const [deleteTarget, setDeleteTarget] = useState<InventoryEntryRow | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | InventoryStatus>("all");

  const totals = useMemo(() => {
    return entries.reduce(
      (acc, e) => {
        const { totalCost, totalSale, profit } = computeTotals({
          quantity: String(e.quantity),
          unit_cost: String(e.unit_cost),
          quantity_sold: String(e.quantity_sold),
          unit_sale_price: e.unit_sale_price != null ? String(e.unit_sale_price) : "",
        });
        acc.totalCost += totalCost;
        acc.totalSale += totalSale;
        acc.totalProfit += profit;
        return acc;
      },
      { totalCost: 0, totalSale: 0, totalProfit: 0 }
    );
  }, [entries]);

  const filtered = useMemo(
    () => (statusFilter === "all" ? entries : entries.filter((e) => e.status === statusFilter)),
    [entries, statusFilter]
  );

  function startAdd() {
    setIsAdding(true);
    setEditingId(null);
    setNewFields(EMPTY_FIELDS);
    setError(null);
  }

  function startEdit(entry: InventoryEntryRow) {
    setEditingId(entry.id);
    setEditFields(fieldsFromEntry(entry));
    setIsAdding(false);
    setError(null);
  }

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      try {
        await createInventoryEntry(toFormData(newFields));
        setIsAdding(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "حدث خطأ ما، حاول مرة أخرى.");
      }
    });
  }

  function handleUpdate(original: InventoryEntryRow) {
    setError(null);
    // "last_sale_date يتحدث لما أعدّل الكمية المباعة" — auto-stamp today
    // only when quantity_sold actually changed and the admin didn't also
    // touch last_sale_date themselves in this same edit.
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

  async function handleDelete() {
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
            سجل داخلي لتتبع دفعات البضاعة والمبيعات · {entries.length} دفعة
          </p>
        </div>
        {!isAdding && (
          <Button variant="primary" onClick={startAdd}>
            <Plus size={16} />
            إضافة دفعة جديدة
          </Button>
        )}
      </div>

      {error && <p className="mb-4 font-inter text-sm text-terracotta-deep">{error}</p>}

      {/* All-time summary — always the full totals, unaffected by the filter below. */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-cream/10 bg-bg-secondary p-4">
          <p className="font-inter text-xs uppercase tracking-widest text-cream-secondary/50">
            إجمالي المصروف على الجلب
          </p>
          <p className="mt-1 font-playfair text-xl font-bold text-cream">{money(totals.totalCost)}</p>
        </div>
        <div className="rounded-2xl border border-cream/10 bg-bg-secondary p-4">
          <p className="font-inter text-xs uppercase tracking-widest text-cream-secondary/50">
            إجمالي الإيراد من المبيعات
          </p>
          <p className="mt-1 font-playfair text-xl font-bold text-cream">{money(totals.totalSale)}</p>
        </div>
        <div className="rounded-2xl border border-cream/10 bg-bg-secondary p-4">
          <p className="font-inter text-xs uppercase tracking-widest text-cream-secondary/50">
            إجمالي الربح الصافي
          </p>
          <p
            className={cn(
              "mt-1 font-playfair text-xl font-bold",
              totals.totalProfit >= 0 ? "text-forest" : "text-terracotta-deep"
            )}
          >
            {money(totals.totalProfit)}
          </p>
        </div>
      </div>

      {/* Status filter */}
      <div className="mb-4 flex flex-wrap gap-2">
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

      <div className="overflow-x-auto rounded-2xl border border-cream/10">
        <table className="w-full min-w-[1500px] border-collapse text-start">
          <thead>
            <tr className="border-b border-cream/10 bg-bg-secondary">
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
                  className="whitespace-nowrap px-4 py-3 text-start font-inter text-xs uppercase tracking-widest text-cream-secondary/60"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isAdding && (
              <EditableRow
                fields={newFields}
                onChange={setNewFields}
                onSave={handleCreate}
                onCancel={() => setIsAdding(false)}
                saving={isPending}
              />
            )}

            {filtered.length === 0 && !isAdding ? (
              <tr>
                <td colSpan={13} className="px-4 py-16 text-center font-inter text-cream-secondary/60">
                  لا توجد دفعات بعد.
                </td>
              </tr>
            ) : (
              filtered.map((entry) =>
                editingId === entry.id ? (
                  <EditableRow
                    key={entry.id}
                    fields={editFields}
                    onChange={setEditFields}
                    onSave={() => handleUpdate(entry)}
                    onCancel={() => setEditingId(null)}
                    saving={isPending}
                  />
                ) : (
                  <DisplayRow
                    key={entry.id}
                    entry={entry}
                    onEdit={() => startEdit(entry)}
                    onDelete={() => setDeleteTarget(entry)}
                  />
                )
              )
            )}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <ConfirmDeleteDialog
          description={deleteTarget.item_description}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
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
          <h2 className="font-playfair text-xl font-bold text-cream">حذف الدفعة</h2>
          <p className="mt-2 font-inter text-sm text-cream-secondary/75">
            هل أنت متأكد من حذف دفعة &quot;{description}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
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
