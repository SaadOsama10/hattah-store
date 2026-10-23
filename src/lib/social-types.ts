export type SocialPostStatus =
  | "draft"
  | "approved"
  | "publishing"
  | "published"
  | "failed"
  | "skipped";

export interface SocialSlot {
  type: "feed" | "story";
  time: string; // "HH:MM" Istanbul
}

export interface SocialSettingsRow {
  id: number;
  enabled: boolean;
  auto_approve: boolean;
  daily_slots: SocialSlot[];
  caption_languages: string[];
  hashtags_base: string[];
  excluded_product_ids: string[];
  jitter_minutes: number;
  /** undefined until migration 016 is applied */
  store_url?: string;
  consecutive_failures: number;
  last_error: string | null;
  auto_disabled_at: string | null;
}

export interface SocialPostWithProduct {
  id: string;
  product_id: string | null;
  post_type: "feed" | "story";
  angle: "showcase" | "heritage" | "quote" | "offer";
  image_url: string | null;
  caption_full: string | null;
  design: { headline?: string; subline?: string } | null;
  scheduled_at: string;
  status: SocialPostStatus;
  ig_media_id: string | null;
  ig_permalink: string | null;
  fb_post_id: string | null;
  error: string | null;
  attempts: number;
  published_at: string | null;
  products: { name_ar: string } | null;
}

export const STATUS_LABELS: Record<SocialPostStatus, string> = {
  draft: "مسودة",
  approved: "معتمد",
  publishing: "قيد النشر",
  published: "منشور",
  failed: "فشل",
  skipped: "متجاهَل",
};

export const ANGLE_LABELS: Record<SocialPostWithProduct["angle"], string> = {
  showcase: "عرض المنتج",
  heritage: "حكاية التراث",
  quote: "اقتباس",
  offer: "السعر/العرض",
};
