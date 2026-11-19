"use client";

import { useMemo, useState, useTransition } from "react";
import { Tabs } from "@/components/admin/SocialQueue";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  regenerateTomorrowWithWeights,
  resetAllProductWeights,
  setProductWeights,
  type SocialFocusRow,
} from "@/actions/social";

const LEVELS = [
  { w: 0, label: "استبعاد" },
  { w: 0.5, label: "قليل" },
  { w: 1, label: "عادي" },
  { w: 2, label: "عالي" },
  { w: 4, label: "عالي جداً" },
] as const;

/** Product slots per day that draw from the weighted picker: 3 feed + 1 carousel + 1 reel (stories mostly reuse feed products). */
const DAILY_PICKS = 5;

export function SocialFocus({ rows, categories }: { rows: SocialFocusRow[]; categories: { key: string; label: string }[] }) {
  const [weights, setWeights] = useState(() => new Map(rows.map((r) => [r.id, r.weight])));
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const shown = useMemo(
    () => rows.filter((r) => (!cat || r.category === cat) && (!q || r.name_ar.includes(q) || r.category_label.includes(q))),
    [rows, q, cat],
  );

  const summary = useMemo(() => {
    const totalW = [...weights.values()].reduce((a, b) => a + b, 0);
    return LEVELS.map(({ w, label }) => {
      const n = [...weights.values()].filter((x) => x === w).length;
      const share = totalW > 0 ? (n * w) / totalW : 0;
      return { w, label, n, share, perDay: share * DAILY_PICKS };
    });
  }, [weights]);

  function apply(ids: string[], w: number) {
    if (!ids.length) return;
    setError(null);
    setNotice(null);
    const prev = new Map(weights);
    setWeights((m) => {
      const n = new Map(m);
      ids.forEach((id) => n.set(id, w));
      return n;
    });
    start(async () => {
      try {
        await setProductWeights(ids, w);
      } catch (e) {
        setWeights(prev);
        setError((e as Error).message);
      }
    });
  }

  function resetAll() {
    if (!window.confirm("إعادة وزن كل المنتجات إلى «عادي»؟")) return;
    setError(null);
    const prev = new Map(weights);
    setWeights(new Map(rows.map((r) => [r.id, 1])));
    start(async () => {
      try {
        await resetAllProductWeights();
        setNotice("تمت إعادة كل المنتجات إلى «عادي».");
      } catch (e) {
        setWeights(prev);
        setError((e as Error).message);
      }
    });
  }

  function regenerate() {
    if (
      !window.confirm(
        "سيتم إلغاء منشورات الغد التلقائية غير المنشورة وتوليدها من جديد بالأوزان الحالية (المنشورات اليدوية لا تُمس). متابعة؟",
      )
    )
      return;
    setError(null);
    start(async () => {
      try {
        const r = await regenerateTomorrowWithWeights();
        setNotice(`أُلغي ${r.skipped} منشور وأُرسل طلب التوليد إلى GitHub Actions — ستظهر منشورات الغد في «القادمة» خلال دقائق.`);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  function toggleSel(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  const allShownSelected = shown.length > 0 && shown.every((r) => selected.has(r.id));
  const selIds = [...selected];
  const levelBtn = (active: boolean, w: number) =>
    cn(
      "rounded-full px-3 py-1 font-inter text-xs transition-colors disabled:opacity-60",
      active
        ? w === 0
          ? "bg-terracotta-deep text-on-accent"
          : w === 0.5
            ? "bg-amber-700/70 text-cream"
            : w === 1
            ? "bg-cream/25 text-cream"
            : "bg-forest text-on-accent"
        : "border border-cream/20 text-cream-secondary/80 hover:text-cream",
    );

  return (
    <div dir="rtl" className="space-y-6">
      <div className="space-y-4">
        <h1 className="font-playfair text-3xl text-cream">السوشيال ميديا</h1>
        <Tabs tab="focus" />
      </div>

      <p className="font-inter text-sm text-cream-secondary/80">
        اختر المنتجات التي يركّز عليها النشر التلقائي: «قليل» نصف الاحتمال، «عالي» ضعف الاحتمال، «عالي جداً» أربعة أضعاف، «استبعاد» لا يُنشر أبدًا. يُحفظ كل تغيير فورًا.
        التغيير يؤثر على التوليد القادم فقط، ولا يمس منشورات الغد المولّدة إلا بزر إعادة التوليد.
      </p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {summary.map((s) => (
          <div key={s.w} className="rounded-2xl border border-cream/15 bg-bg-secondary p-4">
            <p className="font-inter text-xs text-cream-secondary/70">{s.label}</p>
            <p className="font-playfair text-3xl text-cream">{s.n}</p>
            <p className="font-inter text-xs text-cream-secondary/70">
              {s.w === 0 ? "خارج النشر" : `≈ ${(s.share * 100).toFixed(0)}٪ من الاختيارات (~${s.perDay.toFixed(1)} من ${DAILY_PICKS} يوميًا)`}
            </p>
          </div>
        ))}
      </div>
      <p className="font-inter text-xs text-cream-secondary/60">
        النسب تقديرية: تفترض أن كل منتج متاح، وتتغير قليلًا بفترة الهدوء بعد كل نشر وأفضلية المنتجات التي لم تُنشر منذ مدة. تُحسب على 5 خانات يوميًا (3 بوستات + كروسيل + ريل)، والستوريز تعيد منتجات البوستات.
      </p>

      {error && <p className="font-inter text-sm text-terracotta-deep">{error}</p>}
      {notice && (
        <p className="rounded-xl border border-forest/30 bg-forest/10 px-4 py-3 font-inter text-sm text-cream">{notice}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="بحث…"
          className="w-full max-w-xs rounded-lg border border-cream/20 bg-bg-primary px-3 py-2 font-inter text-sm text-cream focus:border-terracotta focus:outline-none"
        />
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="rounded-lg border border-cream/20 bg-bg-primary px-3 py-2 font-inter text-sm text-cream focus:border-terracotta focus:outline-none"
        >
          <option value="">كل الفئات</option>
          {categories.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        <Button variant="secondary" disabled={pending} onClick={resetAll}>
          إعادة الكل لعادي
        </Button>
        <Button variant="secondary" disabled={pending} onClick={regenerate}>
          إعادة توليد منشورات الغد بالأوزان الجديدة
        </Button>
      </div>

      <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-cream/15 bg-bg-secondary p-3">
        <label className="flex items-center gap-2 font-inter text-sm text-cream">
          <input
            type="checkbox"
            checked={allShownSelected}
            onChange={() =>
              setSelected((s) => {
                const n = new Set(s);
                allShownSelected ? shown.forEach((r) => n.delete(r.id)) : shown.forEach((r) => n.add(r.id));
                return n;
              })
            }
          />
          تحديد المعروض ({shown.length})
        </label>
        <span className="font-inter text-sm text-cream-secondary/80">المحدد: {selected.size}</span>
        {LEVELS.map((l) => (
          <button
            key={l.w}
            type="button"
            disabled={pending || selected.size === 0}
            onClick={() => apply(selIds, l.w)}
            className={levelBtn(false, l.w)}
          >
            تطبيق: {l.label}
          </button>
        ))}
        {selected.size > 0 && (
          <button type="button" onClick={() => setSelected(new Set())} className="font-inter text-xs text-cream-secondary/70 underline">
            إلغاء التحديد
          </button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {shown.map((p) => {
          const w = weights.get(p.id) ?? 1;
          return (
            <div
              key={p.id}
              className={cn(
                "flex items-center gap-3 rounded-2xl border bg-bg-secondary p-3",
                selected.has(p.id) ? "border-terracotta" : "border-cream/15",
                w === 0 && "opacity-60",
              )}
            >
              <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSel(p.id)} aria-label="تحديد" />
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="h-16 w-16 shrink-0 rounded-lg bg-cream/5" />
              )}
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <p className="truncate font-inter text-sm text-cream">{p.name_ar}</p>
                  <p className="truncate font-inter text-xs text-cream-secondary/70">{p.category_label}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {LEVELS.map((l) => (
                    <button key={l.w} type="button" disabled={pending} onClick={() => apply([p.id], l.w)} className={levelBtn(w === l.w, l.w)}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
