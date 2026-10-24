export type PostType = "feed" | "story" | "reel";
export type Angle = "showcase" | "heritage" | "quote" | "offer";
export const ANGLES: Angle[] = ["showcase", "heritage", "quote", "offer"];
export type PostStatus =
  | "draft"
  | "approved"
  | "publishing"
  | "published"
  | "failed"
  | "skipped";

export interface Slot {
  type: PostType;
  time: string; // "HH:MM", Istanbul time
}

/** Short design copy written by the model together with the caption. */
export interface DesignText {
  /** ≤6 words, the big line on the image. */
  headline?: string;
  /** ≤15 words, the supporting line. */
  subline?: string;
}

export interface SocialSettings {
  id: number;
  enabled: boolean;
  auto_approve: boolean;
  daily_slots: Slot[];
  caption_languages: string[];
  hashtags_base: string[];
  excluded_product_ids: string[];
  jitter_minutes: number;
  /** Printed on images (no protocol). Optional until migration 016 is applied. */
  store_url?: string;
  /** Direct Facebook API publishing; undefined/false until enabled (migration 018). */
  publish_to_facebook?: boolean;
  consecutive_failures: number;
  last_error: string | null;
  auto_disabled_at: string | null;
}

export interface SocialPostRow {
  id: string;
  product_id: string | null;
  post_type: PostType;
  angle: Angle;
  image_url: string | null;
  /** Rendered MP4 (reels only); deleted from storage right after publishing. */
  video_url?: string | null;
  caption_full: string | null;
  design: DesignText | null;
  scheduled_at: string;
  status: PostStatus;
  ig_media_id: string | null;
  fb_post_id: string | null;
  error: string | null;
  attempts: number;
  created_at: string;
  published_at: string | null;
}

export interface ProductImage {
  image_url: string;
  sort_order: number;
}

export interface ProductRecord {
  id: string;
  name_ar: string;
  name_en: string;
  name_tr: string;
  description_ar: string;
  description_en: string;
  description_tr: string;
  price: number;
  sale_price: number | null;
  category: string;
  has_quantities: boolean;
  has_sizes: boolean;
  has_colors: boolean;
  created_at: string;
  product_images: ProductImage[];
  product_sizes: { label: string }[];
  product_colors: { label_ar: string; label_en: string }[];
  product_quantities: { label_ar: string; label_en: string; price: number }[];
}
