export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "905529987112";

export function buildWhatsAppOrderLink(message: string) {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
}

/** Appends the chosen size/color to a product name for display in a
 * WhatsApp message, e.g. "Shawl - Size: L - Color: Black". Used by both
 * the single-product order button and the cart checkout message so the
 * two stay in sync. */
export function formatProductWithVariants(
  name: string,
  sizeLabel: string,
  colorLabel: string,
  size?: string,
  color?: string
): string {
  const parts = [name];
  if (size) parts.push(`${sizeLabel}: ${size}`);
  if (color) parts.push(`${colorLabel}: ${color}`);
  return parts.join(" - ");
}

/** Builds a single consolidated WhatsApp message for every item in the
 * cart — "1. Name - Size: L × 2" per line plus a translated intro/total —
 * and returns the wa.me link, reusing the same number as a single-product
 * order so cart checkout and the per-product button behave identically. */
export function buildWhatsAppCartLink(
  items: { name: string; quantity: number; size?: string; color?: string }[],
  intro: string,
  totalLine: string,
  sizeLabel: string,
  colorLabel: string
): string {
  const lines = items.map((item, i) => {
    const label = formatProductWithVariants(item.name, sizeLabel, colorLabel, item.size, item.color);
    return `${i + 1}. ${label} × ${item.quantity}`;
  });
  const message = [intro, "", ...lines, "", totalLine].join("\n");
  return buildWhatsAppOrderLink(message);
}

/** A human-friendly display of WHATSAPP_NUMBER, e.g. "+90 552 998 71 12". */
export function formatWhatsAppNumberForDisplay(): string {
  const digits = WHATSAPP_NUMBER.replace(/\D/g, "");
  // Turkish mobile format: +90 5XX XXX XX XX (2-3-3-2-2).
  if (digits.length === 12) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`;
  }
  const country = digits.slice(0, 2);
  const groups = digits.slice(2).match(/.{1,3}/g) ?? [];
  return `+${country} ${groups.join(" ")}`.trim();
}
