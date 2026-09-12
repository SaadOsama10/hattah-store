import { cn } from "@/lib/cn";

function Star({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0 L14.2 9.8 24 12 14.2 14.2 12 24 9.8 14.2 0 12 9.8 9.8 Z" />
    </svg>
  );
}

/** A handful of small decorative stars/dots for a playful, lively hero.
 * Purely visual — aria-hidden, positioned absolutely by the parent. */
export function Sparkles({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0", className)}>
      <Star className="animate-float-slow absolute start-[12%] top-[22%] h-4 w-4 text-terracotta/50" />
      <span className="animate-float absolute end-[15%] top-[18%] h-2.5 w-2.5 rounded-full bg-forest/50" />
      <Star className="animate-float absolute end-[10%] top-[62%] h-3 w-3 text-olive/50" />
      <span className="animate-float-slow absolute start-[18%] top-[70%] h-2 w-2 rounded-full bg-terracotta/40" />
      <Star className="animate-float-slow absolute start-[46%] top-[10%] h-2.5 w-2.5 text-forest/40" />
    </div>
  );
}
