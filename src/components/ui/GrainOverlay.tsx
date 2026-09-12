import { cn } from "@/lib/cn";

/** A faint, non-repeating-looking noise texture — adds a touch of
 * atmosphere/depth to a section without being a discernible pattern
 * (unlike the old keffiyeh lattice this replaces). Neutral, so it needs
 * no light/dark variant. */
export function GrainOverlay({
  className,
  opacity = "opacity-[0.03]",
}: {
  className?: string;
  opacity?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 bg-grain", opacity, className)}
    />
  );
}
