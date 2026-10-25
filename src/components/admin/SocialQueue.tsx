"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Settings } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import {
  requestPublishNow,
  requestRegenerate,
  setSocialPostStatus,
  updateSocialPost,
} from "@/actions/social";
import { cn } from "@/lib/cn";
import {
  ANGLE_LABELS,
  STATUS_LABELS,
  type SocialPostStatus,
  type SocialPostWithProduct,
} from "@/lib/social-types";

const STATUS_CLASSES: Record<SocialPostStatus, string> = {
  draft: "bg-cream/10 text-cream-secondary",
  approved: "bg-forest/15 text-forest",
  publishing: "bg-terracotta/15 text-terracotta",
  published: "bg-forest/15 text-forest",
  failed: "bg-terracotta-deep/15 text-terracotta-deep",
  skipped: "bg-cream/10 text-cream-secondary/60",
};

const TZ = "Europe/Istanbul";

/** ISO → "YYYY-MM-DDTHH:mm" in Istanbul time, for <input type=datetime-local>. */
function toInput(iso: string): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
  return parts.replace(" ", "T");
}
/** Istanbul wall-clock input → UTC ISO (Istanbul is fixed UTC+3). */
const fromInput = (v: string) => new Date(`${v}:00+03:00`).toISOString();

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("ar", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    numberingSystem: "latn",
  }).format(new Date(iso));

const fbLink = (id: string) => `https://www.facebook.com/${id}`;

export function Tabs({ tab }: { tab: "upcoming" | "history" | "products" }) {
  const item = (active: boolean) =>
    cn(
      "rounded-full px-4 py-1.5 font-inter text-sm transition-colors",
      active ? "bg-terracotta text-cream" : "text-cream-secondary/70 hover:text-cream"
    );
  return (
    <div className="flex items-center gap-2">
      <Link href="/admin/social" className={item(tab === "upcoming")}>
        القادمة
      </Link>
      <Link href="/admin/social?tab=history" className={item(tab === "history")}>
        السجل
      </Link>
      <Link href="/admin/social?tab=products" className={item(tab === "products")}>
        المنتجات
      </Link>
      <Link
        href="/admin/social/settings"
        className="ms-auto flex items-center gap-1.5 font-inter text-sm text-cream-secondary/70 hover:text-terracotta"
      >
        <Settings size={14} />
        الإعدادات
      </Link>
    </div>
  );
}

export function SocialQueue({
  posts,
  tab,
}: {
  posts: SocialPostWithProduct[];
  tab: "upcoming" | "history";
}) {
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <div dir="rtl" className="space-y-6">
      <div className="space-y-4">
        <h1 className="font-playfair text-3xl text-cream">السوشيال ميديا</h1>
        <Tabs tab={tab} />
      </div>
      {notice && (
        <p className="rounded-xl border border-forest/30 bg-forest/10 px-4 py-3 font-inter text-sm text-cream">
          {notice}
        </p>
      )}
      {posts.length === 0 ? (
        <p className="rounded-2xl border border-cream/15 bg-bg-secondary px-6 py-12 text-center font-inter text-cream-secondary/70">
          {tab === "upcoming"
            ? "لا توجد منشورات قادمة. شغّل «توليد منشورات الغد» من الإعدادات."
            : "لا يوجد سجل بعد."}
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} history={tab === "history"} onNotice={setNotice} />
          ))}
        </div>
      )}
    </div>
  );
}

function PostCard({
  post,
  history,
  onNotice,
}: {
  post: SocialPostWithProduct;
  history: boolean;
  onNotice: (m: string) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [caption, setCaption] = useState(post.caption_full ?? "");
  const [when, setWhen] = useState(toInput(post.scheduled_at));
  const [headline, setHeadline] = useState(post.design?.headline ?? "");
  const [subline, setSubline] = useState(post.design?.subline ?? "");
  const [error, setError] = useState<string | null>(null);
  const editable = ["draft", "approved", "failed"].includes(post.status);
  const isStory = post.post_type === "story";
  const isReel = post.post_type === "reel";
  const isCarousel = post.post_type === "carousel";
  const kindLabel = isReel ? "ريل" : isCarousel ? "كاروسيل" : isStory ? "ستوري" : "منشور";
  const textDirty =
    headline !== (post.design?.headline ?? "") || subline !== (post.design?.subline ?? "");
  const dirty =
    caption !== (post.caption_full ?? "") || when !== toInput(post.scheduled_at) || textDirty;

  function run(fn: () => Promise<void>, doneMsg?: string) {
    setError(null);
    start(async () => {
      try {
        await fn();
        if (doneMsg) onNotice(doneMsg);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  const dispatched =
    "تم إرسال الطلب إلى GitHub Actions — يستغرق عادةً 1–3 دقائق، ثم حدّث الصفحة.";

  return (
    <article className="overflow-hidden rounded-2xl border border-cream/15 bg-bg-secondary">
      <div className="flex gap-4 p-4">
        <div className="w-32 shrink-0 sm:w-40">
          {isCarousel && post.slides?.length ? (
            // Swipeable preview of the slides (scroll-snap)
            <div className="flex w-full snap-x snap-mandatory gap-2 overflow-x-auto rounded-lg border border-cream/10" dir="ltr">
              {post.slides.map((u, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={u} src={u} alt={`slide ${i + 1}`} className="aspect-[4/5] w-full shrink-0 snap-center object-cover" />
              ))}
            </div>
          ) : post.video_url ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              src={post.video_url}
              poster={post.image_url ?? undefined}
              controls
              playsInline
              preload="metadata"
              className="aspect-[9/16] w-full rounded-lg border border-cream/10 bg-black object-cover"
            />
          ) : post.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.image_url}
              alt=""
              className={cn("w-full rounded-lg border border-cream/10 object-cover", isStory || isReel ? "aspect-[9/16]" : "aspect-[4/5]")}
            />
          ) : (
            <div className="flex aspect-[4/5] items-center justify-center rounded-lg bg-cream/5 text-xs text-cream-secondary/50">
              بدون صورة
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-2.5 py-0.5 font-inter text-xs", STATUS_CLASSES[post.status])}>
              {STATUS_LABELS[post.status]}
            </span>
            <span className="rounded-full bg-cream/10 px-2.5 py-0.5 font-inter text-xs text-cream-secondary">
              {kindLabel}{isCarousel && post.slides?.length ? ` (${post.slides.length} شرائح)` : ""} · {ANGLE_LABELS[post.angle]}
            </span>
          </div>
          <p className="font-inter text-sm font-semibold text-cream">{post.products?.name_ar ?? "— منتج محذوف —"}</p>
          {editable ? (
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="w-full rounded-lg border border-cream/20 bg-bg-primary px-2 py-1.5 font-inter text-sm text-cream focus:border-terracotta focus:outline-none"
            />
          ) : (
            <p className="font-inter text-sm text-cream-secondary">{fmtDate(post.scheduled_at)}</p>
          )}
          <p className="font-inter text-[11px] text-cream-secondary/50">توقيت إسطنبول</p>
          {post.error && (
            <p className="rounded-lg bg-terracotta-deep/10 px-2 py-1.5 font-inter text-xs text-terracotta-deep">{post.error}</p>
          )}
          {history && post.status === "published" && (
            <div className="flex flex-wrap gap-3 font-inter text-sm">
              {post.ig_permalink && (
                <a href={post.ig_permalink} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-terracotta hover:underline">
                  <ExternalLink size={13} /> إنستغرام
                </a>
              )}
              {post.fb_post_id && (
                <a href={fbLink(post.fb_post_id)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-terracotta hover:underline">
                  <ExternalLink size={13} /> فيسبوك
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 px-4 pb-3">
        <p className="font-inter text-xs text-cream-secondary/70">نص التصميم (يُطبع على الصورة — بعد التعديل احفظ ثم اضغط «إعادة التصميم»)</p>
        <input
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          disabled={!editable}
          maxLength={60}
          placeholder="العنوان (حتى 6 كلمات)"
          className="w-full rounded-lg border border-cream/20 bg-bg-primary px-3 py-1.5 font-inter text-sm text-cream focus:border-terracotta focus:outline-none disabled:opacity-70"
        />
        <input
          value={subline}
          onChange={(e) => setSubline(e.target.value)}
          disabled={!editable}
          maxLength={140}
          placeholder="السطر الفرعي (حتى 15 كلمة)"
          className="w-full rounded-lg border border-cream/20 bg-bg-primary px-3 py-1.5 font-inter text-sm text-cream focus:border-terracotta focus:outline-none disabled:opacity-70"
        />
      </div>

      {!isStory && (
        <div className="px-4 pb-3">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            disabled={!editable}
            rows={6}
            className="w-full rounded-lg border border-cream/20 bg-bg-primary p-3 font-inter text-sm leading-relaxed text-cream focus:border-terracotta focus:outline-none disabled:opacity-70"
          />
          <p className="mt-1 text-end font-inter text-[11px] text-cream-secondary/50">{caption.length} / 2200</p>
        </div>
      )}

      {error && <p className="px-4 pb-2 font-inter text-xs text-terracotta-deep">{error}</p>}

      {editable && (
        <div className="flex flex-wrap gap-2 border-t border-cream/10 p-4">
          {dirty && (
            <Button
              size="md"
              variant="secondary"
              disabled={pending}
              onClick={() =>
                run(() => updateSocialPost(post.id, {
                    caption_full: isStory ? undefined : caption,
                    scheduled_at: fromInput(when),
                    design: textDirty ? { headline, subline } : undefined,
                  }), textDirty ? "تم الحفظ — اضغط «إعادة التصميم» لتحديث الصورة بالنص الجديد." : "تم الحفظ")
              }
            >
              حفظ التعديلات
            </Button>
          )}
          {post.status === "approved" ? (
            <Button size="md" variant="ghost" disabled={pending} onClick={() => run(() => setSocialPostStatus(post.id, "draft"))}>
              إلغاء الاعتماد
            </Button>
          ) : (
            <Button size="md" disabled={pending || dirty || !post.image_url} onClick={() => run(() => setSocialPostStatus(post.id, "approved"), "تم الاعتماد")}>
              اعتماد
            </Button>
          )}
          <Button size="md" variant="secondary" disabled={pending || dirty} onClick={() => run(() => requestRegenerate(post.id, "image"), dispatched)}>
            إعادة التصميم
          </Button>
          {!isStory && (
            <Button size="md" variant="secondary" disabled={pending} onClick={() => run(() => requestRegenerate(post.id, "caption"), dispatched)}>
              إعادة الكابشن
            </Button>
          )}
          <Button size="md" variant="secondary" disabled={pending} onClick={() => run(() => requestRegenerate(post.id, "swap"), dispatched)}>
            تبديل المنتج
          </Button>
          <Button size="md" variant="ghost" disabled={pending} onClick={() => run(() => setSocialPostStatus(post.id, "skipped"))}>
            تجاهل
          </Button>
          <Button
            size="md"
            variant="whatsapp"
            disabled={pending || dirty || !post.image_url || (isReel && !post.video_url)}
            onClick={() => {
              if (confirm("نشر هذا العنصر الآن؟")) {
                run(() => requestPublishNow(post.id), dispatched);
              }
            }}
          >
            انشر الآن
          </Button>
        </div>
      )}
      {post.status === "skipped" && (
        <div className="border-t border-cream/10 p-4">
          <Button size="md" variant="secondary" disabled={pending} onClick={() => run(() => setSocialPostStatus(post.id, "draft"))}>
            استرجاع
          </Button>
        </div>
      )}
    </article>
  );
}
