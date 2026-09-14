import {
  Shirt,
  Gem,
  Home,
  Gamepad2,
  UtensilsCrossed,
  Gift,
  ShoppingBag,
  Footprints,
  Glasses,
  Watch,
  Flower2,
  BookOpen,
  Coffee,
  Key,
  Diamond,
  Lamp,
  Sparkles,
  Star,
  type LucideIcon,
} from "lucide-react";

/** The fixed set of icons an admin can assign to a category (stored as
 * `categories.icon_key`) — deliberately a closed list from the project's
 * existing icon library (lucide-react), never a free-form upload, so every
 * category tile stays visually consistent with the rest of the site. */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  shirt: Shirt,
  gem: Gem,
  home: Home,
  gamepad: Gamepad2,
  utensils: UtensilsCrossed,
  gift: Gift,
  bag: ShoppingBag,
  footprints: Footprints,
  glasses: Glasses,
  watch: Watch,
  flower: Flower2,
  book: BookOpen,
  coffee: Coffee,
  key: Key,
  diamond: Diamond,
  lamp: Lamp,
  sparkles: Sparkles,
  star: Star,
};

export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICONS);

export function getCategoryIcon(iconKey: string): LucideIcon {
  return CATEGORY_ICONS[iconKey] ?? Gift;
}
