import { cn } from "@/lib/cn";

interface BlobSpec {
  className: string;
  color: string;
  size: number;
  animate?: "animate-float" | "animate-float-slow";
}

const DEFAULT_BLOBS: BlobSpec[] = [
  {
    className: "-start-24 -top-20",
    color: "var(--color-forest)",
    size: 420,
    animate: "animate-float-slow",
  },
  {
    className: "-end-28 top-1/3",
    color: "var(--color-terracotta)",
    size: 380,
    animate: "animate-float",
  },
  {
    className: "start-1/3 -bottom-32",
    color: "var(--color-olive)",
    size: 460,
    animate: "animate-float-slow",
  },
];

/** Soft, semi-transparent organic blobs used as ambient decoration
 * behind hero/section content. Purely visual — aria-hidden. */
export function FloatingBlobs({
  blobs = DEFAULT_BLOBS,
  className,
}: {
  blobs?: BlobSpec[];
  className?: string;
}) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {blobs.map((blob, i) => (
        <span
          key={i}
          className={cn("absolute rounded-full blur-3xl", blob.className, blob.animate)}
          style={{
            width: blob.size,
            height: blob.size,
            background: blob.color,
            opacity: 0.14,
          }}
        />
      ))}
    </div>
  );
}
