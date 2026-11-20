import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";

export interface Crumb {
  label: string;
  href?: string;
}

/** Header for listing pages (shop, category): breadcrumbs, a large title
 * and an optional description on the warm alternate tone. */
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
    <header className="relative bg-bg-secondary">
      <div className="mx-auto max-w-7xl px-gutter pb-12 pt-8 sm:pb-16 sm:pt-12">
        {crumbs.length > 0 && (
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1 font-inter text-sm text-muted">
              {crumbs.map((c, i) => (
                <li key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronLeft size={14} aria-hidden className="ltr:rotate-180" />}
                  {c.href ? (
                    <Link href={c.href as "/"} className="inline-flex min-h-9 items-center hover:text-cream">
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
        {eyebrow && <p className="mt-8 font-inter text-sm text-muted">{eyebrow}</p>}
        <h1 className="mt-2 font-playfair text-[clamp(2.3rem,1.5rem+3.4vw,4.4rem)] font-bold leading-[1.15] text-cream text-balance">{title}</h1>
        {description && <p className="mt-5 max-w-2xl font-inter text-base leading-relaxed text-cream-secondary sm:text-lg">{description}</p>}
        {children}
      </div>
    </header>
  );
}
