import Image from "next/image";
import type { ReactNode } from "react";
import { KufiyaNet } from "@/components/ui/KufiyaNet";

/** Branded full-height state (404, not found, error): logo in a slowly
 * turning dotted ring over a faint kufiya net with a gold glow. */
export function BrandStatus({ code, title, body, children }: { code?: string; title: string; body: string; children?: ReactNode }) {
  return (
    <section className="relative isolate flex min-h-[72vh] flex-col items-center justify-center overflow-hidden px-6 py-20 text-center">
      <KufiyaNet className="band-pattern pointer-events-none absolute inset-0 -z-10 text-olive" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[38%] -z-10 h-[36rem] w-[36rem] max-w-[140vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--t-gold-glow),transparent_62%)]" />
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 200 200" aria-hidden className="spin-slow absolute -inset-[30%] h-[160%] w-[160%]">
          <circle cx="100" cy="100" r="94" fill="none" stroke="var(--color-gold-line)" strokeWidth="0.8" strokeDasharray="1.5 5" />
          <circle cx="100" cy="100" r="84" fill="none" stroke="var(--color-gold-line)" strokeWidth="0.5" opacity="0.6" />
        </svg>
        <Image src="/images/hattah-logo-sm.webp" alt="HATTAH — حَطّة" width={112} height={112} className="relative h-full w-full rounded-full shadow-lift" />
      </div>
      {code && (
        <p dir="ltr" className="mt-10 font-bold tracking-[0.4em] text-gold" style={{ fontFamily: "var(--font-brand), Georgia, serif" }}>
          {code}
        </p>
      )}
      <h1 className="mt-3 font-playfair text-[clamp(2rem,1.4rem+2.6vw,3.4rem)] font-bold text-cream text-balance">{title}</h1>
      <span aria-hidden className="gold-rule mx-auto mt-5" />
      <p className="mt-5 max-w-md font-inter leading-relaxed text-cream-secondary">{body}</p>
      {children && <div className="mt-10 flex flex-wrap items-center justify-center gap-3">{children}</div>}
    </section>
  );
}
