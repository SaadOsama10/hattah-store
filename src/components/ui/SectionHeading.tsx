import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { KufiyaDivider } from "@/components/ui/KufiyaDivider";
import { cn } from "@/lib/cn";

/** Story-style section title: optional eyebrow, the heading (h2 by
 * default), the kufiya divider right under it, an optional subtitle
 * and an optional "see all" link on the far side. */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "start",
  action,
  as: H = "h2",
  className,
  id,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  align?: "start" | "center";
  action?: { href: string; label: string };
  as?: "h1" | "h2";
  className?: string;
  id?: string;
}) {
  const centered = align === "center";
  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-4 sm:mb-10",
        centered ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className={cn("max-w-2xl", centered && "flex flex-col items-center")}>
        {eyebrow && (
          <p className="mb-2 font-inter text-eyebrow font-semibold uppercase tracking-[0.18em] text-terracotta">{eyebrow}</p>
        )}
        <H id={id} className="font-playfair text-h2 font-bold text-cream">
          {title}
        </H>
        <KufiyaDivider align={centered ? "center" : "start"} size="sm" className="mt-3" />
        {subtitle && <p className="mt-3 font-inter text-base leading-relaxed text-cream-secondary">{subtitle}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="group inline-flex min-h-11 shrink-0 items-center gap-1.5 self-start rounded-full px-1 font-inter text-sm font-semibold text-terracotta transition-colors hover:text-cream sm:self-auto"
        >
          {action.label}
          <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
        </Link>
      )}
    </div>
  );
}
