"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import {
  decideDescriptionDraft,
  requestDescriptionSuggestions,
  requestSeoHealthCheck,
  type DescriptionDraft,
  type SeoHealth,
} from "@/actions/seo";

const LANG: Record<string, string> = { ar: "العربية", en: "English", tr: "Türkçe" };

export function SeoDashboard({
  health,
  drafts,
  draftsReady,
}: {
  health: SeoHealth | null;
  drafts: DescriptionDraft[];
  draftsReady: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});

  const run = (fn: () => Promise<unknown>, ok?: string) =>
    start(async () => {
      try {
        await fn();
        if (ok) setMsg(ok);
        router.refresh();
      } catch (e) {
        setMsg((e as Error).message);
      }
    });

  return (
    <div dir="rtl" className="space-y-10">
      <h1 className="font-playfair text-3xl text-cream">SEO و GEO</h1>
      {msg && <p className="rounded-xl border border-forest/30 bg-forest/10 px-4 py-3 font-inter text-sm text-cream">{msg}</p>}

      <section className="space-y-3 rounded-2xl border border-cream/15 bg-bg-secondary p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-inter text-lg font-semibold text-cream">الفحص الأسبوعي</h2>
          <Button size="md" variant="secondary" disabled={pending} onClick={() => run(requestSeoHealthCheck, "تم إرسال الطلب إلى GitHub Actions — النتيجة بعد ~10 دقائق.")}>
            افحص الآن
          </Button>
        </div>
        {!health || !health.checked_at ? (
          <p className="font-inter text-sm text-cream-secondary/70">لا توجد نتائج بعد (شغّل migration 017 ثم «افحص الآن»).</p>
        ) : (
          <>
            <p className="flex items-center gap-2 font-inter text-sm text-cream">
              {health.ok ? <CheckCircle2 className="text-forest" size={18} /> : <AlertTriangle className="text-terracotta-deep" size={18} />}
              {health.ok ? "كل شيء سليم" : `${health.problems.length} مشكلة`} — آخر فحص: {new Date(health.checked_at).toLocaleString("ar", { numberingSystem: "latn" })}
            </p>
            {health.problems.length > 0 && (
              <ul className="list-disc space-y-1 ps-6 font-inter text-sm text-terracotta-deep">
                {health.problems.map((p, i) => (
                  <li key={i}>
                    [{p.area}] {p.message}
                  </li>
                ))}
              </ul>
            )}
            {health.scores && (
              <table className="w-full text-sm" dir="ltr">
                <thead className="text-cream-secondary/70">
                  <tr><th className="text-start">page</th><th>perf</th><th>seo</th><th>a11y</th><th>best</th></tr>
                </thead>
                <tbody className="text-cream">
                  {Object.entries(health.scores).map(([url, s]) => (
                    <tr key={url}>
                      <td className="max-w-[260px] truncate">{url}</td>
                      <td className="text-center">{s.performance}</td>
                      <td className="text-center">{s.seo}</td>
                      <td className="text-center">{s.accessibility}</td>
                      <td className="text-center">{s["best-practices"]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-cream/15 bg-bg-secondary p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-inter text-lg font-semibold text-cream">اقتراحات أوصاف المنتجات ({drafts.length})</h2>
          <Button size="md" variant="secondary" disabled={pending} onClick={() => run(requestDescriptionSuggestions, "تم إرسال الطلب — ستظهر الاقتراحات هنا خلال دقائق.")}>
            اقترح أوصافًا للمنتجات القصيرة
          </Button>
        </div>
        {!draftsReady ? (
          <p className="font-inter text-sm text-cream-secondary/70">شغّل migration 017 أولاً.</p>
        ) : drafts.length === 0 ? (
          <p className="font-inter text-sm text-cream-secondary/70">لا توجد اقتراحات بانتظار الموافقة. لا يُستبدل أي وصف قبل موافقتك.</p>
        ) : (
          drafts.map((d) => (
            <article key={d.id} className="space-y-3 rounded-xl border border-cream/10 p-4">
              <p className="font-inter text-sm font-semibold text-cream">
                {d.products?.name_ar ?? d.products?.name_en} — {LANG[d.lang]}
              </p>
              <div>
                <p className="mb-1 font-inter text-xs text-cream-secondary/60">الحالي ({d.current_text.length} حرف)</p>
                <p className="whitespace-pre-line rounded-lg bg-bg-primary p-3 font-inter text-sm text-cream-secondary" dir={d.lang === "ar" ? "rtl" : "ltr"}>
                  {d.current_text || "—"}
                </p>
              </div>
              <div>
                <p className="mb-1 font-inter text-xs text-cream-secondary/60">المقترح (يمكنك تعديله قبل الاعتماد)</p>
                <textarea
                  rows={7}
                  dir={d.lang === "ar" ? "rtl" : "ltr"}
                  value={edits[d.id] ?? d.suggested_text}
                  onChange={(e) => setEdits((m) => ({ ...m, [d.id]: e.target.value }))}
                  className="w-full rounded-lg border border-cream/20 bg-bg-primary p-3 font-inter text-sm text-cream focus:border-terracotta focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <Button size="md" disabled={pending} onClick={() => run(() => decideDescriptionDraft(d.id, true, edits[d.id]), "تم استبدال الوصف")}>
                  اعتماد واستبدال
                </Button>
                <Button size="md" variant="ghost" disabled={pending} onClick={() => run(() => decideDescriptionDraft(d.id, false))}>
                  رفض
                </Button>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
