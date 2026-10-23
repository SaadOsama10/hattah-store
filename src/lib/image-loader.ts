import { variantPath } from "@/lib/image-variants";

const PRODUCT_MARKER = "/storage/v1/object/public/product-images/";

/** next/image custom loader: Supabase product photos → the closest pre-generated WebP
 * variant; everything else (local assets) is served as-is. */
export default function imageLoader({ src, width }: { src: string; width: number }): string {
  if (!src.includes(PRODUCT_MARKER)) return src;
  return variantPath(src, width <= 560 ? 480 : 960);
}
