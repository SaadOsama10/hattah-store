"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import {
  requestGenerate,
  saveSocialSettings,
  testMetaConnection,
} from "@/actions/social";
import type { SocialSettingsRow, SocialSlot } from "@/lib/social-types";

const field =
  "w-full rounded-lg border border-cream/20 bg-bg-primary px-3 py-2 font-inter text-sm text-cream focus:border-terracotta focus:outline-none";

export function SocialSettingsForm({
  initial,
  products,
}: {
  initial: Omit<SocialSettingsRow, "id"> & { id?: number };
  products: { id: string; name_ar: string }[];
}) {
  const [s, setS] = useState({
    enabled: initial.enabled,
    auto_approve: initial.auto_approve,
    daily_slots: initial.daily_slots as SocialSlot[],
    caption_languages: initial.caption_languages,
    hashtags_base: initial.hashtags_base,
    excluded_product_ids: initial.excluded_product_ids,
  });
  const [hashText, setHashText] = useState(initial.hashtags_base.join(" "));
  const [filter, setFilter] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const say = (ok: boolean, text: string) => setMsg({ ok, text });
  const run = (fn: () => Promise<void>) =>
    start(async () => {
      try {
        await fn();
      } catch (e) {
        say(false, (e as Error).message);
      }
    });

  const setSlot = (i: number, patch: Partial<SocialSlot>) =>
    setS((p) => ({ ...p, daily_slots: p.daily_slots.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));

  const toggleLang = (l: string) =>
    setS((p) => ({
      ...p,
      caption_languages: p.caption_languages.includes(l)
        ? p.caption_languages.filter((x) => x !== l)
        : [...p.caption_languages, l],
    }));

  const shown = products.filter((p) => !filter || p.name_ar.includes(filter));

  return (
    <div dir="rtl" className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2">
        <Link href="/admin/social" className="font-inter text-sm text-cream-secondary/70 hover:text-terracotta">
          ← رجوع للمنشورات
        </Link>
        <h1 className="font-playfair text-3xl text-cream">إعدادات السوشيال ميديا</h1>
      </div>

      <section className="space-y-3">
        <Toggle
          checked={s.enabled}
          onChange={(v) => setS((p) => ({ ...p, enabled: v }))}
          label="تفعيل النشر التلقائي"
          description="عند الإيقاف لا يتم توليد ولا نشر أي شيء."
        />
        <Toggle
          checked={s.auto_approve}
          onChange={(v) => setS((p) => ({ ...p, auto_approve: v }))}
          label="اعتماد تلقائي"
          description="إذا فُعّل يُنشر كل شيء في موعده بدون مراجعتك. الأفضل تركه مطفأً في البداية."
        />
      </section>

      <section className="space-y-3 rounded-2xl border border-cream/15 bg-bg-secondary p-5">
        <h2 className="font-inter text-sm font-semibold text-cream">مواعيد النشر اليومية (توقيت إسطنبول)</h2>
        {s.daily_slots.map((slot, i) => (
          <div key={i} className="flex items-center gap-3">
            <select
              value={slot.type}
              onChange={(e) => setSlot(i, { type: e.target.value as SocialSlot["type"] })}
              className={field + " !w-36"}
            >
              <option value="feed">منشور</option>
              <option value="story">ستوري</option>
            </select>
            <input
              type="time"
              value={slot.time}
              onChange={(e) => setSlot(i, { time: e.target.value })}
              className={field + " !w-36"}
            />
            <button
              type="button"
              aria-label="حذف"
              onClick={() => setS((p) => ({ ...p, daily_slots: p.daily_slots.filter((_, j) => j !== i) }))}
              className="text-cream-secondary/60 hover:text-terracotta-deep"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setS((p) => ({ ...p, daily_slots: [...p.daily_slots, { type: "feed", time: "15:00" }] }))}
          className="flex items-center gap-1.5 font-inter text-sm text-terracotta hover:underline"
        >
          <Plus size={14} /> إضافة موعد
        </button>
      </section>

      <section className="space-y-3 rounded-2xl border border-cream/15 bg-bg-secondary p-5">
        <h2 className="font-inter text-sm font-semibold text-cream">لغات الكابشن</h2>
        <div className="flex gap-4 font-inter text-sm text-cream">
          {[
            ["ar", "العربية"],
            ["en", "English"],
            ["tr", "Türkçe"],
          ].map(([l, label]) => (
            <label key={l} className="flex items-center gap-2">
              <input type="checkbox" checked={s.caption_languages.includes(l)} onChange={() => toggleLang(l)} />
              {label}
            </label>
          ))}
        </div>
        <h2 className="pt-2 font-inter text-sm font-semibold text-cream">الهاشتاغات الأساسية</h2>
        <textarea
          value={hashText}
          onChange={(e) => setHashText(e.target.value)}
          rows={3}
          dir="auto"
          className={field}
          placeholder="#حطة #فلسطين #Palestine"
        />
        <p className="font-inter text-xs text-cream-secondary/60">افصل بينها بمسافة. تُدمج مع هاشتاغات خاصة بكل منتج (حتى 10 إجمالًا).</p>
      </section>

      <section className="space-y-3 rounded-2xl border border-cream/15 bg-bg-secondary p-5">
        <h2 className="font-inter text-sm font-semibold text-cream">
          منتجات مستثناة من النشر ({s.excluded_product_ids.length})
        </h2>
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="بحث…" className={field} />
        <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-cream/10 p-2">
          {shown.map((p) => (
            <label key={p.id} className="flex items-center gap-2 font-inter text-sm text-cream">
              <input
                type="checkbox"
                checked={s.excluded_product_ids.includes(p.id)}
                onChange={() =>
                  setS((prev) => ({
                    ...prev,
                    excluded_product_ids: prev.excluded_product_ids.includes(p.id)
                      ? prev.excluded_product_ids.filter((x) => x !== p.id)
                      : [...prev.excluded_product_ids, p.id],
                  }))
                }
              />
              {p.name_ar}
            </label>
          ))}
        </div>
      </section>

      {msg && (
        <p
          className={`rounded-xl border px-4 py-3 font-inter text-sm ${
            msg.ok ? "border-forest/30 bg-forest/10 text-cream" : "border-terracotta-deep/30 bg-terracotta-deep/10 text-terracotta-deep"
          }`}
        >
          {msg.text}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          disabled={pending}
          onClick={() =>
            run(async () => {
              await saveSocialSettings({
                ...s,
                hashtags_base: hashText.split(/\s+/).filter(Boolean),
              });
              say(true, "تم حفظ الإعدادات");
            })
          }
        >
          حفظ الإعدادات
        </Button>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() =>
            run(async () => {
              await requestGenerate("tomorrow");
              say(true, "تم إرسال الطلب إلى GitHub Actions — ستظهر منشورات الغد في «القادمة» خلال دقائق.");
            })
          }
        >
          توليد منشورات الغد الآن
        </Button>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const r = await testMetaConnection();
              say(r.ok, r.ok ? `الاتصال سليم ✓ إنستغرام: @${r.instagram} — الصفحة: ${r.page}` : `فشل الاتصال: ${r.error}`);
            })
          }
        >
          اختبار الاتصال بـ Meta
        </Button>
      </div>
    </div>
  );
}
