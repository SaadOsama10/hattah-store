"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { createSale, deleteSale, updateSale } from "@/actions/sales";
import type { SaleWithItems } from "@/lib/supabase/types";

interface FormState {
  id: string | null;
  sale_date: string;
  total_try: string;
  notes: string;
  items: { item_name: string; quantity: string }[];
}

const money = (n: number) => `₺ ${n.toLocaleString()}`;

const emptyForm = (): FormState => ({
  id: null,
  sale_date: new Date().toISOString().slice(0, 10),
  total_try: "",
  notes: "",
  items: [{ item_name: "", quantity: "1" }],
});

const inputCls =
  "w-full rounded-lg border border-cream/15 bg-bg-primary px-3 py-2 font-inter text-sm text-cream outline-none focus:border-terracotta";

export function SalesManager({ sales }: { sales: SaleWithItems[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const days = useMemo(() => {
    const map = new Map<string, SaleWithItems[]>();
    for (const s of sales) map.set(s.sale_date, [...(map.get(s.sale_date) ?? []), s]);
    return [...map.entries()].map(([date, list]) => ({
      date,
      list,
      total: list.reduce((sum, s) => sum + Number(s.total_try), 0),
    }));
  }, [sales]);
  const grand = days.reduce((sum, d) => sum + d.total, 0);

  function edit(s: SaleWithItems) {
    setError(null);
    setForm({
      id: s.id,
      sale_date: s.sale_date,
      total_try: String(s.total_try),
      notes: s.notes ?? "",
      items: s.sale_items.map((i) => ({ item_name: i.item_name, quantity: String(i.quantity) })),
    });
  }

  function save() {
    if (!form) return;
    const input = {
      sale_date: form.sale_date,
      total_try: Number(form.total_try),
      notes: form.notes,
      items: form.items.map((i) => ({ item_name: i.item_name, quantity: Number(i.quantity) })),
    };
    startTransition(async () => {
      try {
        if (form.id) await updateSale(form.id, input);
        else await createSale(input);
        setForm(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "تعذّر الحفظ");
      }
    });
  }

  function remove(id: string) {
    if (!window.confirm("حذف هذه البيعة؟")) return;
    startTransition(async () => {
      await deleteSale(id);
      router.refresh();
    });
  }

  return (
    <div dir="rtl" className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-playfair text-2xl text-cream">المبيعات</h1>
          <p className="mt-1 font-inter text-sm text-cream-secondary">
            {sales.length} بيعة · المجموع الكلي <b className="text-terracotta">{money(grand)}</b>
          </p>
        </div>
        <Button onClick={() => { setError(null); setForm(emptyForm()); }}>
          <Plus size={16} /> بيعة جديدة
        </Button>
      </div>

      {days.length === 0 && (
        <p className="py-12 text-center font-inter text-cream-secondary">ما في مبيعات بعد.</p>
      )}

      <div className="space-y-6">
        {days.map((day) => (
          <section key={day.date} className="rounded-xl border border-cream/10 bg-bg-secondary/40">
            <header className="flex items-center justify-between border-b border-cream/10 px-4 py-3">
              <span className="font-inter text-sm text-cream" dir="ltr">{day.date}</span>
              <span className="font-inter text-sm text-terracotta">{money(day.total)}</span>
            </header>
            <ul className="divide-y divide-cream/10">
              {day.list.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-inter text-sm text-cream">
                      {s.sale_items.map((i) => `${i.item_name} × ${i.quantity}`).join(" + ")}
                    </p>
                    {s.notes && <p className="mt-1 font-inter text-xs text-cream-secondary/70">{s.notes}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-inter text-sm text-cream">{money(Number(s.total_try))}</span>
                    <button type="button" onClick={() => edit(s)} aria-label="تعديل" className="text-cream-secondary hover:text-terracotta">
                      <Pencil size={15} />
                    </button>
                    <button type="button" onClick={() => remove(s.id)} disabled={isPending} aria-label="حذف" className="text-cream-secondary hover:text-terracotta-deep">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-cream/15 bg-bg-primary p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-playfair text-lg text-cream">{form.id ? "تعديل بيعة" : "بيعة جديدة"}</h2>
              <button type="button" onClick={() => setForm(null)} aria-label="إغلاق"><X size={18} className="text-cream-secondary" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="font-inter text-xs text-cream-secondary">التاريخ
                  <input type="date" className={inputCls} value={form.sale_date} onChange={(e) => setForm({ ...form, sale_date: e.target.value })} />
                </label>
                <label className="font-inter text-xs text-cream-secondary">المجموع (₺)
                  <input type="number" min="0" step="0.01" className={inputCls} value={form.total_try} onChange={(e) => setForm({ ...form, total_try: e.target.value })} />
                </label>
              </div>
              <div className="space-y-2">
                <span className="font-inter text-xs text-cream-secondary">الأصناف (بسعر واحد للبيعة كلها)</span>
                {form.items.map((it, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input className={inputCls} placeholder="اسم الصنف" value={it.item_name}
                      onChange={(e) => setForm({ ...form, items: form.items.map((x, i) => (i === idx ? { ...x, item_name: e.target.value } : x)) })} />
                    <input type="number" min="0" step="any" className={`${inputCls} !w-20`} value={it.quantity}
                      onChange={(e) => setForm({ ...form, items: form.items.map((x, i) => (i === idx ? { ...x, quantity: e.target.value } : x)) })} />
                    {form.items.length > 1 && (
                      <button type="button" aria-label="إزالة" onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })}>
                        <X size={16} className="text-cream-secondary" />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="font-inter text-xs text-terracotta" onClick={() => setForm({ ...form, items: [...form.items, { item_name: "", quantity: "1" }] })}>
                  + صنف آخر
                </button>
              </div>
              <label className="block font-inter text-xs text-cream-secondary">ملاحظات
                <textarea rows={2} className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </label>
              {error && <p className="font-inter text-sm text-terracotta-deep">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setForm(null)}>إلغاء</Button>
                <Button onClick={save} disabled={isPending}>{isPending ? "..." : "حفظ"}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
