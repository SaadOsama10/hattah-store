import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { KufiyaNet } from "@/components/ui/KufiyaNet";

export interface Crumb {
  label: string;
  href?: string;
}

/** Banner header for listing pages (shop, category): warm band with the
 * kufiya net and a soft gold glow, breadcrumbs, eyebrow, large title, a
 * gold rule and an optional description. */
export function PageHeader({
  title,
  eyebrow,
  description,
  crumbs = [],
  children,
}: {
  title: string;
  eyebrow?: string;
  description?: string | null;
  crumbs?: Crumb[];
  children?: ReactNode;
}) {
  return (
    <header className="relative isolate overflow-hidden bg-bg-secondary">
      <KufiyaNet className="band-pattern pointer-events-none absolute inset-0 -z-10 text-olive" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[30rem] w-[min(70rem,140vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,var(--t-gold-glow),transparent_62%)] opacity-70"
      />
      <div className="mx-auto max-w-7xl px-gutter pb-10 pt-8 sm:pb-14 sm:pt-12">
        {crumbs.length > 0 && (
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1 font-inter text-sm text-muted">
              {crumbs.map((c, i) => (
                <li key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronLeft size={14} aria-hidden className="ltr:rotate-180" />}
                  {c.href ? (
                    <Link href={c.href as "/"} className="inline-flex min-h-9 items-center hover:text-gold">
                      {c.label}
                    </Link>
                  ) : (
                    <span aria-current="page" className="text-cream-secondary">
                      {c.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        {eyebrow && <p className="mt-6 font-inter text-eyebrow font-semibold uppercase tracking-[0.24em] text-gold">{eyebrow}</p>}
        <h1 className="mt-2 font-playfair text-[clamp(2.3rem,1.5rem+3.4vw,4.4rem)] font-bold leading-[1.15] text-cream text-balance">{title}</h1>
        <span aria-hidden className="gold-rule mt-5" style={{ transform: "none" }} />
        {description && <p className="mt-5 max-w-2xl font-inter text-base leading-relaxed text-cream-secondary sm:text-lg">{description}</p>}
        {children}
      </div>
    </header>
  );
}
