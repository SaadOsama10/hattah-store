// Product photos are stored once at up to 2000px. To keep pages light we also store
// small WebP variants next to each original ("<name>.w480.webp", "<name>.w960.webp").
// The custom next/image loader (image-loader.ts) picks the right one by requested width,
// so we never depend on Vercel's capped image optimizer.
export const VARIANT_WIDTHS = [480, 960] as const;

/** "dir/name.jpg" → "dir/name.w480.webp" (works for full URLs too). */
export function variantPath(pathOrUrl: string, width: number): string {
  return pathOrUrl.replace(/\.[a-z0-9]+(\?.*)?$/i, "") + `.w${width}.webp`;
}
