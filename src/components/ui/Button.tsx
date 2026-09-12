"use client";

import { cn } from "@/lib/cn";
import { Link } from "@/i18n/navigation";
import { playClick } from "@/lib/sound";
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "whatsapp";
type Size = "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-terracotta text-cream hover:bg-terracotta-deep border border-transparent hover:shadow-glow-terracotta",
  secondary:
    "bg-transparent text-cream border border-cream/40 hover:border-cream hover:bg-cream/5",
  ghost: "bg-transparent text-cream border border-transparent hover:bg-cream/10",
  whatsapp:
    "bg-forest text-cream hover:bg-[#175c40] border border-transparent shadow-lg shadow-forest/20 hover:shadow-glow-forest",
};

const sizeClasses: Record<Size, string> = {
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-4 text-base",
};

const SOUND_VARIANTS: Variant[] = ["primary", "whatsapp"];

const baseClasses =
  "inline-flex items-center justify-center gap-2 font-inter font-semibold tracking-wide uppercase transition-all duration-300 rounded-full disabled:opacity-50 disabled:pointer-events-none hover:-translate-y-0.5 hover:scale-[1.03] active:translate-y-0 active:scale-[0.98]";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

interface ButtonAsButton
  extends CommonProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  href?: undefined;
}

interface ButtonAsLink extends CommonProps {
  href: string;
  target?: string;
  rel?: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
}

type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button(props: ButtonProps) {
  const { variant = "primary", size = "md", className, children } = props;
  const classes = cn(baseClasses, variantClasses[variant], sizeClasses[size], className);
  const withSound = SOUND_VARIANTS.includes(variant);

  if ("href" in props && props.href) {
    const { href, target, rel, onClick } = props;
    return (
      <Link
        href={href}
        target={target}
        rel={rel}
        className={classes}
        onClick={(e) => {
          if (withSound) playClick();
          onClick?.(e);
        }}
      >
        {children}
      </Link>
    );
  }

  const { onClick, ...buttonProps } = props as ButtonAsButton;
  return (
    <button
      {...buttonProps}
      onClick={(e) => {
        if (withSound) playClick();
        onClick?.(e);
      }}
      className={classes}
    >
      {children}
    </button>
  );
}
