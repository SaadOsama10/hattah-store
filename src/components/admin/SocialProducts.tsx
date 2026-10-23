"use client";

import { useState, useTransition } from "react";
import { Tabs } from "@/components/admin/SocialQueue";
import { Toggle } from "@/components/ui/Toggle";
import { setProductRemoveBg, type SocialProductRow } from "@/actions/social";

export function SocialProducts({ products }: { products: SocialProductRow[] }) {
  const [flags, setFlags] = useState(() => new Map(products.map((p) => [p.id, p.remove_bg])));
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  function toggle(id: string, value: boolean) {
    setError(null);
    const prev = flags.get(id) ?? false;
    setFlags((m) => new Map(m).set(id, value));
    start(async () => {
      try {
        await setProductRemoveBg(id, value);
      } catch (e) {
        setFlags((m) => new Map(m).set(id, prev));
        setError((e as Error).message);
      }
    });
  }

  const shown = products.filter((p) => !filter || p.name_ar.includes(filter));
  const on = [...flags.values()].filter(Boolean).length;

  return (
    <div dir="rtl" className="space-y-6">
      <div className="space-y-4">
        <h1 className="font-playfair text-3xl text-cream">السوشيال ميديا</h1>
        <Tabs tab="products" />
      </div>
      <p className="font-inter text-sm text-cream-secondary/80">
        فعّل «إزالة الخلفية» للمنتجات التي تظهر أجمل معزولة على خلفية الهوية (صور المنتج على خلفية بيضاء مثل البازل والأواني).
        الصور الحياتية (أشخاص/ديكور) اتركها مطفأة. إذا فشلت الإزالة أو بدت سيئة يُستخدم الأصل تلقائيًا. المفعّلة حاليًا: {on}
      </p>
      {error && <p className="font-inter text-sm text-terracotta-deep">{error}</p>}
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="بحث…"
        className="w-full max-w-sm rounded-lg border border-cream/20 bg-bg-primary px-3 py-2 font-inter text-sm text-cream focus:border-terracotta focus:outline-none"
      />
      <div className="grid gap-3 md:grid-cols-2">
        {shown.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-cream/15 bg-bg-secondary p-3">
            {p.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image_url} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="h-16 w-16 shrink-0 rounded-lg bg-cream/5" />
            )}
            <div className="min-w-0 flex-1">
              <Toggle
                checked={flags.get(p.id) ?? false}
                onChange={(v) => toggle(p.id, v)}
                label={p.name_ar}
                description="إزالة الخلفية"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
