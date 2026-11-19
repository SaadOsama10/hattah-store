"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/ui/ProductCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import type { CardProduct } from "@/lib/storefront";
import { Band, type BandTone } from "@/components/ui/Band";

/** A titled, horizontally scrolling row of product cards (swipe on
 * phones, arrow buttons on desktop). Two cards and a peek of the third
 * are visible on a phone. */
export function ProductRail({
  products,
  eyebrow,
  title,
  subtitle,
  action,
  tone = "plain",
  id,
}: {
  products: CardProduct[];
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: { href: string; label: string };
  tone?: BandTone;
  id?: string;
}) {
  const t = useTranslations("common");
  const ref = useRef<HTMLDivElement>(null);
  if (products.length === 0) return null;

  function scroll(dir: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    el.scrollBy({ left: el.clientWidth * 0.85 * dir * (rtl ? -1 : 1), behavior: "smooth" });
  }

  const headingId = id ? `${id}-title` : undefined;

  return (
    <Band tone={tone} labelledBy={headingId} className="cv-auto py-section">
      <div className="mx-auto max-w-7xl px-gutter">
        <Reveal blur>
          <SectionHeading id={headingId} eyebrow={eyebrow} title={title} subtitle={subtitle} action={action} />
        </Reveal>
      </div>
      <div className="relative mx-auto max-w-7xl">
        <div
          ref={ref}
          className="rail gap-4 px-gutter pb-2 [grid-auto-columns:46%] sm:gap-5 sm:[grid-auto-columns:31%] lg:[grid-auto-columns:calc((100%-4*1.25rem-2*var(--spacing-gutter))/4.4)]"
        >
          {products.map((p, i) => (
            <Reveal key={p.id} delay={Math.min(i, 5) * 70}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
        {products.length > 4 && (
          <div className="pointer-events-none absolute inset-x-0 top-[38%] hidden justify-between px-2 lg:flex">
            <button
              type="button"
              onClick={() => scroll(-1)}
              aria-label={t("previous")}
              className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-surface text-cream shadow-lift ring-1 ring-line transition-colors hover:text-terracotta"
            >
              <ChevronLeft size={20} className="rtl:-scale-x-100" />
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              aria-label={t("next")}
              className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-surface text-cream shadow-lift ring-1 ring-line transition-colors hover:text-terracotta"
            >
              <ChevronRight size={20} className="rtl:-scale-x-100" />
            </button>
          </div>
        )}
      </div>
    </Band>
  );
}
