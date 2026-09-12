"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, MessageCircle, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/contexts/CartContext";
import { buildWhatsAppOrderLink, formatProductWithVariants } from "@/lib/whatsapp";
import { playClick } from "@/lib/sound";
import { cn } from "@/lib/cn";

export interface PurchaseProduct {
  id: string;
  name: string;
  price: number;
  image?: string;
}

/** The product page's "buy" area: an optional size/color picker gating
 * both the WhatsApp order button and the Add to Cart button — neither
 * can be used until every option the product actually has is chosen.
 * A product with no sizes/colors renders exactly as before (no pills,
 * no gating, no extra step). */
export function ProductPurchaseActions({
  product,
  sizes,
  colors,
}: {
  product: PurchaseProduct;
  sizes: string[];
  colors: string[];
}) {
  const t = useTranslations("product");
  const tCart = useTranslations("cart");
  const { addItem } = useCart();

  const hasSizes = sizes.length > 0;
  const hasColors = colors.length > 0;

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);

  function validate(): boolean {
    if (hasSizes && !selectedSize) {
      setError(t("selectSizeFirst"));
      return false;
    }
    if (hasColors && !selectedColor) {
      setError(t("selectColorFirst"));
      return false;
    }
    return true;
  }

  function handleAddToCart() {
    if (!validate()) return;
    playClick();
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      size: selectedSize ?? undefined,
      color: selectedColor ?? undefined,
    });
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1500);
  }

  function handleWhatsAppClick(e: React.MouseEvent) {
    if (!validate()) {
      e.preventDefault();
    }
  }

  const productLabel = formatProductWithVariants(
    product.name,
    t("sizeLabel"),
    t("colorLabel"),
    selectedSize ?? undefined,
    selectedColor ?? undefined
  );
  const whatsappHref = buildWhatsAppOrderLink(t("whatsappMessage", { productName: productLabel }));

  return (
    <div className="space-y-5">
      {hasSizes && (
        <div>
          <p className="mb-2 font-inter text-xs uppercase tracking-widest text-cream-secondary/60">
            {t("selectSize")}
          </p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => {
                  playClick();
                  setSelectedSize(size);
                  setError(null);
                }}
                className={cn(
                  "rounded-full border px-4 py-2 font-inter text-sm transition-all duration-300",
                  selectedSize === size
                    ? "border-terracotta bg-terracotta text-cream shadow-glow-terracotta"
                    : "border-cream/20 text-cream-secondary hover:border-cream/50"
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {hasColors && (
        <div>
          <p className="mb-2 font-inter text-xs uppercase tracking-widest text-cream-secondary/60">
            {t("selectColor")}
          </p>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => {
                  playClick();
                  setSelectedColor(color);
                  setError(null);
                }}
                className={cn(
                  "rounded-full border px-4 py-2 font-inter text-sm transition-all duration-300",
                  selectedColor === color
                    ? "border-terracotta bg-terracotta text-cream shadow-glow-terracotta"
                    : "border-cream/20 text-cream-secondary hover:border-cream/50"
                )}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="font-inter text-sm text-terracotta-deep">{error}</p>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          variant="whatsapp"
          size="lg"
          className="w-full sm:w-auto"
          onClick={handleWhatsAppClick}
        >
          <MessageCircle size={20} />
          {t("orderWhatsapp")}
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={handleAddToCart}
          className="w-full sm:w-auto"
        >
          {justAdded ? <Check size={20} /> : <ShoppingBag size={20} />}
          {justAdded ? tCart("added") : tCart("addToCart")}
        </Button>
      </div>
    </div>
  );
}
