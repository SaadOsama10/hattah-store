import Image from "next/image";
import type { ReactNode } from "react";

/** Branded full-height state (404, not found, error): the logo, a large
 * title, one line and the actions. */
export function BrandStatus({ code, title, body, children }: { code?: string; title: string; body: string; children?: ReactNode }) {
  return (
    <section className="flex min-h-[72vh] flex-col items-center justify-center px-6 py-20 text-center">
      <Image src="/images/hattah-logo-sm.webp" alt="HATTAH — حَطّة" width={88} height={88} className="h-22 w-22 rounded-full" />
      {code && (
        <p dir="ltr" className="mt-10 font-bold tracking-[0.4em] text-muted" style={{ fontFamily: "var(--font-brand), Georgia, serif" }}>
          {code}
        </p>
      )}
      <h1 className="mt-3 font-playfair text-[clamp(2rem,1.4rem+2.6vw,3.4rem)] font-bold text-cream text-balance">{title}</h1>
      <p className="mt-5 max-w-md font-inter leading-relaxed text-cream-secondary">{body}</p>
      {children && <div className="mt-10 flex flex-wrap items-center justify-center gap-3">{children}</div>}
    </section>
  );
}
