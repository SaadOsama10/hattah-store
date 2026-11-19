import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

/** Section title system: small spaced eyebrow → large heading (Amiri /
 * Playfair) → short description → a thin gold rule that draws itself when
 * the section reveals (the heading itself sharpens from a slight blur —
 * wrap in <Reveal blur>). Optional "see all" text link with a moving arrow. */
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
        "mb-9 flex flex-col gap-5 sm:mb-12",
        centered ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className={cn("max-w-2xl", centered && "flex flex-col items-center")}>
        {eyebrow && (
          <p className="mb-3 font-inter text-eyebrow font-semibold uppercase tracking-[0.24em] text-gold">{eyebrow}</p>
        )}
        <H id={id} className="font-playfair text-h2 font-bold text-cream text-balance">
          {title}
        </H>
        <span aria-hidden className={cn("gold-rule mt-4", centered && "mx-auto")} />
        {subtitle && <p className="mt-4 max-w-xl font-inter text-base leading-relaxed text-cream-secondary sm:text-lg">{subtitle}</p>}
      </div>
      {action && <TextLink href={action.href} className="self-start sm:self-auto">{action.label}</TextLink>}
    </div>
  );
}

/** Tertiary button: text + arrow that slides on hover. */
export function TextLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full font-inter text-sm font-semibold text-gold transition-colors hover:text-cream",
        className
      )}
    >
      <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-500 ease-soft group-hover:bg-[length:100%_1px]">
        {children}
      </span>
      <ArrowRight size={16} className="transition-transform duration-300 ease-soft group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
    </Link>
  );
}
