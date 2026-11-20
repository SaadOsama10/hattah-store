import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

/** Section title: a large heading and one short line — nothing else.
 * Optional "see all" text link. */
export function SectionHeading({
  title,
  subtitle,
  align = "start",
  action,
  as: H = "h2",
  className,
  id,
}: {
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
        "mb-10 flex flex-col gap-5 sm:mb-14",
        centered ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className={cn("max-w-2xl", centered && "flex flex-col items-center")}>
        <H id={id} className="font-playfair text-h2 font-bold text-cream text-balance">
          {title}
        </H>
        {subtitle && <p className="mt-3 max-w-xl font-inter text-base leading-relaxed text-cream-secondary sm:text-lg">{subtitle}</p>}
      </div>
      {action && (
        <TextLink href={action.href} className="self-start sm:self-auto">
          {action.label}
        </TextLink>
      )}
    </div>
  );
}

/** Tertiary button: text with a thin underline that draws in on hover. */
export function TextLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full font-inter text-sm font-semibold text-cream transition-colors hover:text-terracotta",
        className
      )}
    >
      <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:100%_1px] bg-bottom bg-no-repeat pb-0.5">{children}</span>
      <ArrowRight size={16} className="rtl:-scale-x-100" />
    </Link>
  );
}
