import { cn } from "@/lib/cn";

export function Divider({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-3", className)}>
      <span className="h-px w-12 bg-gradient-to-r from-transparent to-olive" />
      <span className="h-1.5 w-1.5 rotate-45 bg-terracotta" />
      <span className="h-px w-12 bg-gradient-to-l from-transparent to-olive" />
    </div>
  );
}
