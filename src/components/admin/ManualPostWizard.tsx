"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertTriangle, ArrowRight, Check, ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import {
  approveManualPost,
  checkManualWarnings,
  discardManualPost,
  getManualPost,
  rebuildManualPost,
  saveManualCaption,
  saveManualPost,
  type ManualProduct,
  type ManualWarning,
} from "@/actions/social-manual";
import { cn } from "@/lib/cn";
import { MANUAL_MAX_IMAGES } from "@/lib/social-manual-shared";
import { ANGLE_LABELS, type SocialPostWithProduct } from "@/lib/social-types";
import type { MusicTrack } from "@/lib/social-tracks";

type PostType = "feed" | "story" | "reel" | "carousel";
type Angle = keyof typeof ANGLE_LABELS;

const TYPES: { id: PostType; label: string; hint: string }[] = [
  { id: "feed", label: "منشور", hint: "صورة 4:5 + كابشن" },
  { id: "carousel", label: "كاروسيل", hint: "2–5 شرائح + كابشن" },
  { id: "reel", label: "ريل", hint: "فيديو 15 ث + موسيقى" },
  { id: "story", label: "ستوري", hint: "فيديو 7 ث + موسيقى" },
];
const TZ = "Europe/Istanbul";
const input = "w-full rounded-lg border border-cream/20 bg-bg-primary px-3 py-2 font-inter text-sm text-cream focus:border-terracotta focus:outline-none";
const label = "mb-2 block font-inter text-sm font-semibold text-cream";

/** ISO → "YYYY-MM-DDTHH:mm" in Istanbul time. */
function toInput(iso: Date | string): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
    .format(new Date(iso))
    .replace(" ", "T");
}
const fromInput = (v: string) => new Date(`${v}:00+03:00`).toISOString();
const fmt = (iso: string) =>
  new Intl.DateTimeFormat("ar", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", numberingSystem: "latn" }).format(new Date(iso));

function defaultImages(p: ManualProduct | undefined, type: PostType): string[] {
  if (!p) return [];
  if (type === "feed") return p.images.slice(0, 1);
  if (type === "story") return p.images.slice(p.images.length > 1 ? 1 : 0, p.images.length > 1 ? 2 : 1);
  return p.images.slice(0, MANUAL_MAX_IMAGES[type]);
}

export function ManualPostWizard({
  products,
  tracks,
  initial,
}: {
  products: ManualProduct[];
  tracks: MusicTrack[];
  initial: SocialPostWithProduct | null;
}) {
  const [postId, setPostId] = useState<string | null>(initial?.id ?? null);
  const [step, setStep] = useState<"form" | "preview">(initial ? "preview" : "form");
  const [editing, setEditing] = useState<SocialPostWithProduct | null>(initial);
  const [version, setVersion] = useState(0); // remounts the preview after an edit so it polls the new build

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/social" className="flex items-center gap-1.5 font-inter text-sm text-cream-secondary/70 hover:text-terracotta">
          <ArrowRight size={14} /> السوشيال ميديا
        </Link>
        <h1 className="font-playfair text-3xl text-cream">منشور يدوي</h1>
        <span className="rounded-full bg-terracotta/15 px-3 py-0.5 font-inter text-xs text-terracotta">يدوي</span>
      </div>
      {step === "form" ? (
        <Form
          products={products}
          tracks={tracks}
          editing={editing}
          onSaved={(id) => {
            setPostId(id);
            setVersion((v) => v + 1);
            setStep("preview");
            window.history.replaceState(null, "", `?id=${id}`);
          }}
        />
      ) : (
        postId && (
          <Preview
            key={`${postId}-${version}`}
            postId={postId}
            seed={version === 0 ? initial : null}
            tracks={tracks}
            onEdit={(p) => {
              setEditing(p);
              setStep("form");
            }}
          />
        )
      )}
    </div>
  );
}

// ───────────────────────────── form ─────────────────────────────

function Form({
  products,
  tracks,
  editing,
  onSaved,
}: {
  products: ManualProduct[];
  tracks: MusicTrack[];
  editing: SocialPostWithProduct | null;
  onSaved: (id: string) => void;
}) {
  const params = editing?.manual_params;
  const [productId, setProductId] = useState(editing?.product_id ?? "");
  const [type, setType] = useState<PostType>(editing?.post_type ?? "feed");
  const [angle, setAngle] = useState<Angle>(editing?.angle ?? "showcase");
  const [images, setImages] = useState<string[]>(params?.images ?? []);
  const [publishNow, setPublishNow] = useState(!!params?.publish_now);
  const [when, setWhen] = useState(() => (editing && !params?.publish_now ? toInput(editing.scheduled_at) : toInput(new Date(Date.now() + 3 * 3600e3))));
  const [textMode, setTextMode] = useState<"ai" | "manual">(params?.text_mode ?? "ai");
  const [headline, setHeadline] = useState(editing?.design?.headline ?? "");
  const [subline, setSubline] = useState(editing?.design?.subline ?? "");
  const [caption, setCaption] = useState(editing?.caption_full ?? "");
  const [rewrite, setRewrite] = useState(!editing);
  const [music, setMusic] = useState(params?.music ?? "");
  const [query, setQuery] = useState("");
  const [warnings, setWarnings] = useState<ManualWarning[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const product = products.find((p) => p.id === productId);
  const max = MANUAL_MAX_IMAGES[type];
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => !q || [p.name_ar, p.name_en, p.name_tr].some((n) => n.toLowerCase().includes(q)));
  }, [products, query]);

  // Soft warnings, refreshed when the product / time / type / music change.
  const scheduledAt = publishNow ? null : when ? fromInput(when) : null;
  useEffect(() => {
    if (!productId) return setWarnings([]);
    const t = setTimeout(() => {
      checkManualWarnings({ excludeId: editing?.id, productId, postType: type, scheduledAt, music: music || null })
        .then(setWarnings)
        .catch(() => setWarnings([]));
    }, 400);
    return () => clearTimeout(t);
  }, [productId, type, scheduledAt, music, editing?.id]);

  function pickProduct(p: ManualProduct) {
    setProductId(p.id);
    setImages(defaultImages(p, type));
  }
  function pickType(t: PostType) {
    setType(t);
    setImages(defaultImages(product, t));
  }
  function toggleImage(url: string) {
    setImages((cur) => {
      if (max === 1) return [url];
      if (cur.includes(url)) return cur.filter((u) => u !== url);
      return cur.length >= max ? cur : [...cur, url];
    });
  }

  function submit() {
    setError(null);
    if (!productId) return setError("اختر منتجًا");
    if (!images.length) return setError("اختر صورة واحدة على الأقل");
    if (!publishNow && !when) return setError("اختر الموعد");
    start(async () => {
      try {
        const r = await saveManualPost({
          id: editing?.id,
          productId,
          postType: type,
          angle,
          images,
          scheduledAt,
          publishNow,
          textMode,
          headline,
          subline,
          caption,
          music: music || null,
          op: rewrite || !editing ? "full" : "render",
        });
        onSaved(r.id);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* 1 — product */}
      <section className="rounded-2xl border border-cream/15 bg-bg-secondary p-5">
        <span className={label}>1 · المنتج <span className="font-normal text-cream-secondary/60">({products.length} منتج — يشمل المستثنى من الأتمتة)</span></span>
        <div className="relative mb-3">
          <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-cream-secondary/60" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث بالاسم…" className={cn(input, "ps-9")} />
        </div>
        <div className="grid max-h-80 grid-cols-3 gap-3 overflow-y-auto pe-1 sm:grid-cols-4 lg:grid-cols-6">
          {shown.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pickProduct(p)}
              className={cn(
                "overflow-hidden rounded-xl border text-start transition-colors",
                p.id === productId ? "border-terracotta ring-2 ring-terracotta/40" : "border-cream/15 hover:border-cream/40"
              )}
            >
              {p.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.images[0]} alt="" loading="lazy" className="aspect-square w-full object-cover" />
              ) : (
                <div className="flex aspect-square items-center justify-center bg-cream/5 text-xs text-cream-secondary/50">بدون صورة</div>
              )}
              <div className="p-2">
                <p className="line-clamp-2 font-inter text-xs text-cream">{p.name_ar}</p>
                {p.excluded && <p className="mt-0.5 font-inter text-[10px] text-cream-secondary/60">مستثنى من الأتمتة</p>}
              </div>
            </button>
          ))}
          {!shown.length && <p className="col-span-full py-6 text-center font-inter text-sm text-cream-secondary/60">لا نتائج</p>}
        </div>
      </section>

      {/* 2 — type + angle */}
      <section className="grid gap-5 rounded-2xl border border-cream/15 bg-bg-secondary p-5 lg:grid-cols-2">
        <div>
          <span className={label}>2 · النوع</span>
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map((t) => (
              <button key={t.id} type="button" onClick={() => pickType(t.id)}
                className={cn("rounded-xl border px-3 py-2.5 text-start transition-colors", type === t.id ? "border-terracotta bg-terracotta/10" : "border-cream/15 hover:border-cream/40")}>
                <p className="font-inter text-sm font-semibold text-cream">{t.label}</p>
                <p className="font-inter text-[11px] text-cream-secondary/60">{t.hint}</p>
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className={label}>الزاوية</span>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(ANGLE_LABELS) as Angle[]).map((a) => (
              <button key={a} type="button" onClick={() => setAngle(a)}
                className={cn("rounded-xl border px-3 py-2.5 font-inter text-sm text-cream transition-colors", angle === a ? "border-terracotta bg-terracotta/10" : "border-cream/15 hover:border-cream/40")}>
                {ANGLE_LABELS[a]}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3 — photos */}
      <section className="rounded-2xl border border-cream/15 bg-bg-secondary p-5">
        <span className={label}>
          3 · الصور{" "}
          <span className="font-normal text-cream-secondary/60">
            {max === 1 ? "(صورة واحدة)" : `(حتى ${max} — الرقم هو الترتيب${type === "carousel" ? "، الأولى هي الغلاف" : ""})`}
          </span>
        </span>
        {!product ? (
          <p className="font-inter text-sm text-cream-secondary/60">اختر منتجًا أولًا.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {product.images.map((u) => {
              const idx = images.indexOf(u);
              return (
                <button key={u} type="button" onClick={() => toggleImage(u)}
                  className={cn("relative h-28 w-24 overflow-hidden rounded-lg border", idx >= 0 ? "border-terracotta ring-2 ring-terracotta/40" : "border-cream/15 opacity-70 hover:opacity-100")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" className="h-full w-full object-cover" />
                  {idx >= 0 && (
                    <span className="absolute start-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-terracotta font-inter text-xs font-bold text-white">
                      {max === 1 ? <Check size={13} /> : idx + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 4 — when */}
      <section className="rounded-2xl border border-cream/15 bg-bg-secondary p-5">
        <span className={label}>4 · الموعد (توقيت إسطنبول — بدون jitter)</span>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setPublishNow(true)}
            className={cn("rounded-full border px-4 py-1.5 font-inter text-sm", publishNow ? "border-terracotta bg-terracotta text-white" : "border-cream/20 text-cream")}>
            انشر الآن
          </button>
          <button type="button" onClick={() => setPublishNow(false)}
            className={cn("rounded-full border px-4 py-1.5 font-inter text-sm", !publishNow ? "border-terracotta bg-terracotta text-white" : "border-cream/20 text-cream")}>
            موعد محدد
          </button>
          {!publishNow && <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={cn(input, "w-auto")} />}
        </div>
        {publishNow && <p className="mt-2 font-inter text-xs text-cream-secondary/60">يُنشر مباشرة بعد أن تعتمده في المعاينة.</p>}
        <Warnings items={warnings} />
      </section>

      {/* 5 — text */}
      <section className="rounded-2xl border border-cream/15 bg-bg-secondary p-5">
        <span className={label}>5 · النص</span>
        <div className="mb-4 flex gap-2">
          {([["ai", "توليد بالذكاء الاصطناعي"], ["manual", "أكتبه بنفسي"]] as const).map(([m, l]) => (
            <button key={m} type="button" onClick={() => setTextMode(m)}
              className={cn("rounded-full border px-4 py-1.5 font-inter text-sm", textMode === m ? "border-terracotta bg-terracotta text-white" : "border-cream/20 text-cream")}>
              {l}
            </button>
          ))}
        </div>
        {textMode === "ai" ? (
          <div className="space-y-2">
            <p className="font-inter text-sm text-cream-secondary/80">
              {type === "story"
                ? "يكتب النموذج العنوان والسطر الفرعي (نفس قواعد الأتمتة، شامية فلسطينية)."
                : "يكتب النموذج العنوان والسطر الفرعي والكابشن (عربي + تركي + إنجليزي) مع رابط المتجر والواتساب والهاشتاغات — بنفس قواعد الأتمتة، بنداء عادي فوري."}
            </p>
            {editing && (
              <label className="flex items-center gap-2 font-inter text-sm text-cream">
                <input type="checkbox" checked={rewrite} onChange={(e) => setRewrite(e.target.checked)} className="accent-terracotta" />
                اكتب نصًا جديدًا (وإلا يُحتفظ بالنص الحالي ويُعاد الرسم فقط)
              </label>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={60} placeholder="العنوان (حتى 6 كلمات)" className={input} />
            <input value={subline} onChange={(e) => setSubline(e.target.value)} maxLength={140} placeholder="السطر الفرعي (حتى 15 كلمة)" className={input} />
            {type !== "story" && (
              <div>
                <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={9} placeholder="الكابشن كاملًا (يُنشر كما تكتبه — أضف الرابط والهاشتاغات بنفسك)" className={cn(input, "leading-relaxed")} />
                <p className="mt-1 text-end font-inter text-[11px] text-cream-secondary/50">{caption.length} / 2200</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 6 — music */}
      {(type === "reel" || type === "story") && (
        <section className="rounded-2xl border border-cream/15 bg-bg-secondary p-5">
          <span className={label}>6 · الموسيقى <span className="font-normal text-cream-secondary/60">(اختياري)</span></span>
          <select value={music} onChange={(e) => setMusic(e.target.value)} className={input}>
            <option value="">تلقائي — الأقل تكرارًا (موصى به)</option>
            {tracks.map((t) => (
              <option key={t.file} value={t.file}>{t.title} · {Math.round(t.bpm)} BPM</option>
            ))}
          </select>
        </section>
      )}

      {error && <p className="rounded-xl bg-terracotta-deep/10 px-4 py-3 font-inter text-sm text-terracotta-deep">{error}</p>}
      <div className="flex items-center gap-3">
        <Button size="lg" disabled={pending || !productId} onClick={submit}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : null}
          {editing ? "تحديث وإنشاء المعاينة" : "إنشاء المعاينة"}
        </Button>
        <p className="font-inter text-xs text-cream-secondary/60">لا يُنشر شيء قبل أن تعتمد المعاينة.</p>
      </div>
    </div>
  );
}

function Warnings({ items }: { items: ManualWarning[] }) {
  if (!items.length) return null;
  return (
    <ul className="mt-3 space-y-1.5">
      {items.map((w, i) => (
        <li key={i} className="flex items-start gap-2 rounded-lg border border-amber-600/40 bg-amber-500/10 px-3 py-2 font-inter text-xs text-terracotta-deep">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {w.text}
        </li>
      ))}
      <li className="font-inter text-[11px] text-cream-secondary/50">تحذيرات فقط — لا تمنع الاعتماد.</li>
    </ul>
  );
}

// ───────────────────────────── preview ─────────────────────────────

const EXPECT: Record<PostType, string> = {
  feed: "عادةً 2–4 دقائق",
  story: "عادةً 3–6 دقائق",
  carousel: "عادةً 3–6 دقائق",
  reel: "عادةً 5–10 دقائق",
};

function Preview({ postId, seed, tracks, onEdit }: { postId: string; seed: SocialPostWithProduct | null; tracks: MusicTrack[]; onEdit: (p: SocialPostWithProduct) => void }) {
  const router = useRouter();
  const [post, setPost] = useState<SocialPostWithProduct | null>(seed);
  const [caption, setCaption] = useState(seed?.render_state === "ready" ? (seed.caption_full ?? "") : "");
  const [captionDirty, setCaptionDirty] = useState(false);
  const [warnings, setWarnings] = useState<ManualWarning[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [pending, start] = useTransition();
  const lastState = useRef<string | null>(seed?.render_state ?? null);

  const refresh = useCallback(async () => {
    const p = await getManualPost(postId);
    if (!p) return setError("المنشور غير موجود");
    setPost(p);
    // take the (re)generated caption in when a build finishes, unless the owner is mid-edit
    if (p.render_state === "ready" && lastState.current !== "ready") {
      setCaption(p.caption_full ?? "");
      setCaptionDirty(false);
    }
    lastState.current = p.render_state ?? null;
  }, [postId]);

  useEffect(() => {
    refresh().catch((e) => setError((e as Error).message));
  }, [refresh]);
  const busy = post?.render_state === "queued" || post?.render_state === "running";
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => {
      setNow(Date.now());
      refresh().catch(() => {});
    }, 4000);
    return () => clearInterval(t);
  }, [busy, refresh]);

  useEffect(() => {
    if (!post || post.render_state !== "ready" || !post.product_id) return;
    checkManualWarnings({
      excludeId: post.id,
      productId: post.product_id,
      postType: post.post_type,
      scheduledAt: post.manual_params?.publish_now ? null : post.scheduled_at,
      music: post.music_track ?? null,
    }).then(setWarnings).catch(() => {});
  }, [post?.id, post?.render_state, post?.scheduled_at]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error && !post) return <p className="text-terracotta-deep">{error}</p>;
  if (!post) return <p className="flex items-center gap-2 font-inter text-sm text-cream-secondary"><Loader2 size={16} className="animate-spin" /> جارٍ التحميل…</p>;

  if (done) {
    return (
      <div className="space-y-4 rounded-2xl border border-forest/30 bg-forest/10 p-6">
        <p className="font-inter text-base text-cream">{done}</p>
        <div className="flex gap-3">
          <Button size="md" onClick={() => router.push("/admin/social")}>إلى قائمة المنشورات</Button>
          <Button size="md" variant="secondary" onClick={() => (window.location.href = window.location.pathname)}>منشور جديد</Button>
        </div>
      </div>
    );
  }

  const publishNow = !!post.manual_params?.publish_now;
  const ready = post.render_state === "ready";
  const failed = post.render_state === "failed";
  const type = post.post_type;
  const trackTitle = tracks.find((t) => t.file === post.music_track)?.title;
  const run = (fn: () => Promise<unknown>) => {
    setError(null);
    start(async () => {
      try {
        await fn();
        await refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };
  const rebuild = (op: "full" | "render") =>
    run(async () => {
      const r = await rebuildManualPost(postId, op);
      if (r.startError) setError(`تعذّر إطلاق المهمة: ${r.startError}`);
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
      <div className="space-y-3">
        {busy || failed || !ready ? (
          <Progress post={post} now={now} />
        ) : (
          <Media post={post} />
        )}
        {ready && post.render_state === "ready" && (
          <p className="text-center font-inter text-xs text-cream-secondary/60">
            {type === "carousel" ? `${post.slides?.length ?? 0} شرائح — اسحب للمعاينة` : type === "reel" || type === "story" ? "المعاينة فيديو كاملة بالصوت" : "المعاينة بحجم النشر"}
          </p>
        )}
      </div>

      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-terracotta/15 px-2.5 py-0.5 font-inter text-xs text-terracotta">يدوي</span>
          <span className="rounded-full bg-cream/10 px-2.5 py-0.5 font-inter text-xs text-cream-secondary">
            {TYPES.find((t) => t.id === type)?.label} · {ANGLE_LABELS[post.angle]}
          </span>
          <span className="font-inter text-sm font-semibold text-cream">{post.products?.name_ar}</span>
        </div>
        <div className="rounded-xl border border-cream/15 bg-bg-secondary p-4 font-inter text-sm text-cream-secondary">
          <p>الموعد: <b className="text-cream">{publishNow ? "فور الاعتماد" : fmt(post.scheduled_at)}</b> <span className="text-xs text-cream-secondary/60">(إسطنبول)</span></p>
          {trackTitle && <p className="mt-1">الموسيقى: <b className="text-cream">{trackTitle}</b></p>}
          {post.design?.headline && (
            <p className="mt-1">نص التصميم: <b className="text-cream">{post.design.headline}</b> — {post.design.subline}</p>
          )}
        </div>

        {ready && <Warnings items={warnings} />}

        {ready && type !== "story" && (
          <div>
            <span className={label}>الكابشن <span className="font-normal text-cream-secondary/60">(قابل للتعديل مباشرة)</span></span>
            <textarea
              value={caption}
              onChange={(e) => { setCaption(e.target.value); setCaptionDirty(true); }}
              rows={14}
              className={cn(input, "leading-relaxed")}
            />
            <div className="mt-1 flex items-center justify-between">
              <span className="font-inter text-[11px] text-cream-secondary/50">{caption.length} / 2200</span>
              {captionDirty && (
                <Button size="md" variant="secondary" disabled={pending} onClick={() => run(async () => { await saveManualCaption(postId, caption); setCaptionDirty(false); })}>
                  حفظ الكابشن
                </Button>
              )}
            </div>
          </div>
        )}

        {error && <p className="rounded-xl bg-terracotta-deep/10 px-4 py-3 font-inter text-sm text-terracotta-deep">{error}</p>}

        <div className="flex flex-wrap gap-2 border-t border-cream/10 pt-4">
          {ready && (
            <Button size="md" variant="whatsapp" disabled={pending || busy || captionDirty}
              onClick={() => run(async () => {
                if (publishNow && !confirm("سيُنشر هذا العنصر على إنستغرام فور الاعتماد. متابعة؟")) return;
                const r = await approveManualPost(postId, publishNow);
                setDone(r.message);
              })}>
              {publishNow ? "اعتماد ونشر الآن" : "اعتماد وجدولة"}
            </Button>
          )}
          <Button size="md" variant="secondary" disabled={pending || busy || captionDirty} onClick={() => rebuild("full")}>
            إعادة توليد النص
          </Button>
          <Button size="md" variant="secondary" disabled={pending || busy} onClick={() => rebuild("render")}>
            إعادة الرسم
          </Button>
          <Button size="md" variant="secondary" disabled={pending || busy} onClick={() => onEdit(post)}>
            تعديل
          </Button>
          <Button size="md" variant="ghost" disabled={pending}
            onClick={() => { if (confirm("حذف هذه المسودة؟")) run(async () => { await discardManualPost(postId); router.push("/admin/social"); }); }}>
            حذف المسودة
          </Button>
        </div>
        {captionDirty && <p className="font-inter text-xs text-cream-secondary/60">احفظ الكابشن أولًا قبل الاعتماد أو إعادة التوليد.</p>}
        {!publishNow && ready && <p className="font-inter text-xs text-cream-secondary/60">يُنشر تلقائيًا في موعده عبر نفس مسار النشر والفحوص (يلزم أن يكون النظام شغّالًا).</p>}
      </div>
    </div>
  );
}

function Progress({ post, now }: { post: SocialPostWithProduct; now: number }) {
  const state = post.render_state ?? "queued";
  const since = post.render_updated_at ? Math.max(0, Math.round((now - new Date(post.render_updated_at).getTime()) / 1000)) : 0;
  const mm = `${Math.floor(since / 60)}:${String(since % 60).padStart(2, "0")}`;
  const failed = state === "failed";
  const stuck = state === "queued" && since > 15 * 60;
  const steps = [
    { id: "queued", text: "بانتظار GitHub Actions (تجهيز البيئة)" },
    { id: "running", text: post.post_type === "reel" ? "كتابة النص + رسم الإطارات + المونتاج" : post.post_type === "story" ? "كتابة النص + تصوير الفيديو" : "كتابة النص + الرسم" },
    { id: "ready", text: "جاهز للمعاينة" },
  ];
  const at = failed ? -1 : steps.findIndex((s) => s.id === state);
  return (
    <div className={cn("space-y-4 rounded-2xl border p-5", failed ? "border-terracotta-deep/40 bg-terracotta-deep/10" : "border-cream/15 bg-bg-secondary")}>
      {failed ? (
        <>
          <p className="font-inter text-sm font-semibold text-terracotta-deep">فشل التجهيز</p>
          <p className="break-words font-inter text-xs text-terracotta-deep">{post.render_error}</p>
          <p className="font-inter text-xs text-cream-secondary/70">اضغط «إعادة الرسم» لإعادة المحاولة أو «تعديل» لتغيير الاختيارات.</p>
        </>
      ) : (
        <>
          <ul className="space-y-2.5">
            {steps.map((s, i) => (
              <li key={s.id} className={cn("flex items-center gap-2.5 font-inter text-sm", i < at ? "text-forest" : i === at ? "text-cream" : "text-cream-secondary/40")}>
                {i < at ? <Check size={15} /> : i === at ? <Loader2 size={15} className="animate-spin text-terracotta" /> : <span className="h-[15px] w-[15px] rounded-full border border-cream/20" />}
                {s.text}
              </li>
            ))}
          </ul>
          <p className="font-inter text-xs text-cream-secondary/70">
            منذ {mm} · {EXPECT[post.post_type]} · تتحدّث الصفحة تلقائيًا.
          </p>
          {stuck && <p className="font-inter text-xs text-terracotta-deep">تأخر الانتظار أكثر من 15 دقيقة — اضغط «إعادة الرسم» لإعادة الإطلاق.</p>}
        </>
      )}
    </div>
  );
}

function Media({ post }: { post: SocialPostWithProduct }) {
  const slides = post.slides ?? [];
  const [i, setI] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const go = (n: number) => {
    const next = Math.min(slides.length - 1, Math.max(0, n));
    setI(next);
    const el = box.current;
    if (el) el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  };
  if (post.post_type === "carousel" && slides.length) {
    return (
      <div className="relative" dir="ltr">
        <div
          ref={box}
          onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-2xl border border-cream/15 [scrollbar-width:none]"
        >
          {slides.map((u, n) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={u} src={u} alt={`slide ${n + 1}`} className="aspect-[4/5] w-full shrink-0 snap-center object-cover" />
          ))}
        </div>
        {i > 0 && <button onClick={() => go(i - 1)} className="absolute start-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white" aria-label="السابق"><ChevronLeft size={18} /></button>}
        {i < slides.length - 1 && <button onClick={() => go(i + 1)} className="absolute end-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white" aria-label="التالي"><ChevronRight size={18} /></button>}
        <div className="mt-2 flex justify-center gap-1.5">
          {slides.map((_, n) => <span key={n} className={cn("h-1.5 w-1.5 rounded-full", n === i ? "bg-terracotta" : "bg-cream/30")} />)}
        </div>
      </div>
    );
  }
  if (post.video_url) {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video src={post.video_url} poster={post.image_url ?? undefined} controls playsInline preload="metadata" className="aspect-[9/16] w-full rounded-2xl border border-cream/15 bg-black object-cover" />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return post.image_url ? <img src={post.image_url} alt="" className="aspect-[4/5] w-full rounded-2xl border border-cream/15 object-cover" /> : null;
}
