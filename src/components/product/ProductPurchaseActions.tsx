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
  // Base/fallback price — used directly when the product has no
  // quantity options, and as the "starting from" figure otherwise.
  price: number;
  image?: string;
}

export interface QuantityOption {
  label: string;
  price: number;
}

/** The product page's "buy" area: the price display plus optional
 * size/color/quantity pickers gating both the WhatsApp order button and
 * the Add to Cart button — nothing can be used until every option the
 * product actually has is chosen. A quantity option carries its own
 * price, so picking one updates the displayed price and the price paid.
 * A product with none of these renders exactly as before (a plain price,
 * no pills, no gating, no extra step). */
export function ProductPurchaseActions({
  product,
  sizes,
  colors,
  quantities,
}: {
  product: PurchaseProduct;
  sizes: string[];
  colors: string[];
  quantities: QuantityOption[];
}) {
  const t = useTranslations("product");
  const tCart = useTranslations("cart");
  const tCommon = useTranslations("common");
  const { addItem } = useCart();
  const currency = tCommon("currency");

  const hasSizes = sizes.length > 0;
  const hasColors = colors.length > 0;
  const hasQuantities = quantities.length > 0;

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);

  const selectedQuantityOption = quantities.find((q) => q.label === selectedQuantity) ?? null;
  const minQuantityPrice = hasQuantities
    ? Math.min(...quantities.map((q) => q.price))
    : null;
  const displayPrice = hasQuantities
    ? (selectedQuantityOption?.price ?? minQuantityPrice!)
    : product.price;
  const showStartingFrom = hasQuantities && !selectedQuantityOption;

  function validate(): boolean {
    if (hasSizes && !selectedSize) {
      setError(t("selectSizeFirst"));
      return false;
    }
    if (hasColors && !selectedColor) {
      setError(t("selectColorFirst"));
      return false;
    }
    if (hasQuantities && !selectedQuantity) {
      setError(t("selectQuantityFirst"));
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
      price: displayPrice,
      image: product.image,
      size: selectedSize ?? undefined,
      color: selectedColor ?? undefined,
      quantityOption: selectedQuantity ?? undefined,
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
    t("quantityLabel"),
    selectedSize ?? undefined,
    selectedColor ?? undefined,
    selectedQuantity ?? undefined,
    selectedQuantityOption?.price,
    currency
  );
  const whatsappHref = buildWhatsAppOrderLink(t("whatsappMessage", { productName: productLabel }));

  return (
    <div className="space-y-5">
      <p className="font-inter text-2xl text-cream-secondary">
        {showStartingFrom && <span className="me-1.5 text-sm text-cream-secondary/70">{t("startingFrom")}</span>}
        {currency} {displayPrice.toLocaleString()}
      </p>

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

      {hasQuantities && (
        <div>
          <p className="mb-2 font-inter text-xs uppercase tracking-widest text-cream-secondary/60">
            {t("selectQuantity")}
          </p>
          <div className="flex flex-wrap gap-2">
            {quantities.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => {
                  playClick();
                  setSelectedQuantity(q.label);
                  setError(null);
                }}
                className={cn(
                  "rounded-full border px-4 py-2 font-inter text-sm transition-all duration-300",
                  selectedQuantity === q.label
                    ? "border-terracotta bg-terracotta text-cream shadow-glow-terracotta"
                    : "border-cream/20 text-cream-secondary hover:border-cream/50"
                )}
              >
                {q.label} — {currency} {q.price.toLocaleString()}
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
