export type ManualPostType = "feed" | "story" | "reel" | "carousel";

/** Max photos per type: a carousel is hero + 3 photos (+ details slide), a reel uses up to 6, feed/story one. */
export const MANUAL_MAX_IMAGES: Record<ManualPostType, number> = { feed: 1, story: 1, carousel: 4, reel: 6 };
