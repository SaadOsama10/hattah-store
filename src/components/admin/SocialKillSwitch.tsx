"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Power } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { setSocialEnabled } from "@/actions/social";
import { cn } from "@/lib/cn";

/** The system-wide kill switch, always on top of /admin/social, plus the red warning shown
 * when the publisher shut itself down after repeated failures. */
export function SocialKillSwitch({
  enabled,
  autoApprove,
  autoDisabledAt,
  lastError,
  failures,
}: {
  enabled: boolean;
  autoApprove: boolean;
  autoDisabledAt: string | null;
  lastError: string | null;
  failures: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    if (enabled && !confirm("إيقاف النشر والتوليد التلقائي بالكامل؟")) return;
    if (!enabled && !confirm(autoApprove ? "تشغيل النظام؟ المنشورات ستُنشر تلقائيًا في مواعيدها بدون مراجعة." : "تشغيل النظام؟ ستُنشر المنشورات المعتمدة فقط.")) return;
    setError(null);
    start(async () => {
      try {
        await setSocialEnabled(!enabled);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div dir="rtl" className="space-y-3">
      {autoDisabledAt && !enabled && (
        <div className="flex items-start gap-3 rounded-2xl border-2 border-terracotta-deep bg-terracotta-deep/10 p-4">
          <AlertTriangle className="mt-0.5 shrink-0 text-terracotta-deep" size={22} />
          <div className="space-y-1 font-inter text-sm text-cream">
            <p className="font-bold text-terracotta-deep">تم إيقاف النشر التلقائي بسبب فشل متتالٍ ({failures} مرات)</p>
            {lastError && <p className="break-words text-cream-secondary">آخر خطأ: {lastError}</p>}
            <p className="text-cream-secondary">أصلِح السبب (مثلًا توكن Meta منتهٍ) ثم أعد التشغيل من المفتاح أدناه.</p>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={cn(
          "flex w-full items-center justify-between gap-4 rounded-2xl border-2 px-6 py-5 text-start transition-colors disabled:opacity-60",
          enabled ? "border-forest bg-forest/10" : "border-terracotta-deep bg-terracotta-deep/10"
        )}
      >
        <span className="flex items-center gap-4">
          <Power size={32} className={enabled ? "text-forest" : "text-terracotta-deep"} />
          <span>
            <span className="block font-inter text-xl font-bold text-cream">
              {enabled ? "النظام يعمل" : "النظام متوقف"}
            </span>
            <span className="block font-inter text-sm text-cream-secondary/80">
              {enabled
                ? autoApprove
                  ? "التوليد والنشر تلقائيان بدون مراجعة — اضغط للإيقاف"
                  : "ينشر المنشورات المعتمدة فقط — اضغط للإيقاف"
                : "لا توليد ولا نشر — اضغط للتشغيل"}
            </span>
          </span>
        </span>
        <span className={cn("relative h-9 w-16 shrink-0 rounded-full", enabled ? "bg-forest" : "bg-cream/20")}>
          <span className={cn("absolute top-1 h-7 w-7 rounded-full bg-bg-primary shadow transition-all", enabled ? "start-8" : "start-1")} />
        </span>
      </button>
      {error && <p className="font-inter text-sm text-terracotta-deep">{error}</p>}
    </div>
  );
}
