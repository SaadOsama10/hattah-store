"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, MessageCircle, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/contexts/CartContext";
import { buildWhatsAppOrderLink, formatProductWithVariants } from "@/lib/whatsapp";
import { playClick } from "@/lib/sound";
import { cn } from "@/lib/cn";
import { isProductOnSale, discountPercent } from "@/lib/supabase/types";

export interface PurchaseProduct {
  id: string;
  name: string;
  // Base/fallback price — used directly when the product has no
  // quantity options, and as the "starting from" figure otherwise.
  price: number;
  // Optional sale price — only ever applies when the product has no
  // quantity options (quantities carry their own per-option pricing).
  salePrice?: number | null;
  // No public price: WhatsApp-only ordering, no cart, no price display.
  priceOnRequest?: boolean;
  // Absolute product URL, included in the price-inquiry WhatsApp message.
  url?: string;
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
  optionLabel,
}: {
  product: PurchaseProduct;
  sizes: string[];
  colors: string[];
  quantities: QuantityOption[];
  // Custom name of the priced options (e.g. "Size"); null = default "Quantity".
  optionLabel?: string | null;
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
  // A product whose options have a custom name (e.g. sizes) opens with the first one chosen.
  const [selectedQuantity, setSelectedQuantity] = useState<string | null>(
    optionLabel && quantities.length > 0 ? quantities[0].label : null
  );
  const [error, setError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);

  const selectedQuantityOption = quantities.find((q) => q.label === selectedQuantity) ?? null;
  const minQuantityPrice = hasQuantities
    ? Math.min(...quantities.map((q) => q.price))
    : null;
  const priceOnRequest = product.priceOnRequest === true;
  const isOnSale = !priceOnRequest && !hasQuantities && isProductOnSale(product.price, product.salePrice ?? null);
  const displayPrice = hasQuantities
    ? (selectedQuantityOption?.price ?? minQuantityPrice!)
    : isOnSale
      ? (product.salePrice as number)
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
      setError(optionLabel ? t("selectOptionFirst", { label: optionLabel }) : t("selectQuantityFirst"));
      return false;
    }
    return true;
  }

  function handleAddToCart() {
    if (priceOnRequest) return;
    if (!validate()) return;
    playClick();
    addItem({
      id: product.id,
      name: product.name,
      price: displayPrice,
      originalPrice: isOnSale ? product.price : undefined,
      image: product.image,
      size: selectedSize ?? undefined,
      color: selectedColor ?? undefined,
      quantityOption: selectedQuantity ?? undefined,
      optionLabel: optionLabel ?? undefined,
    });
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1500);
  }

  function handleWhatsAppClick(e: React.MouseEvent) {
    if (!validate()) {
      e.preventDefault();
      // from the sticky bar: bring the options (and the error) into view
      optionsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  // Phones: a sticky order bar appears once the main buttons have scrolled out of view.
  const optionsRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [showBar, setShowBar] = useState(false);
  useEffect(() => {
    const el = actionsRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 1023px)").matches;
    document.documentElement.style.setProperty("--bottom-bar", showBar && mobile ? "4.75rem" : "0px");
    return () => document.documentElement.style.setProperty("--bottom-bar", "0px");
  }, [showBar]);

  const productLabel = formatProductWithVariants(
    product.name,
    t("sizeLabel"),
    t("colorLabel"),
    optionLabel ?? t("quantityLabel"),
    selectedSize ?? undefined,
    selectedColor ?? undefined,
    selectedQuantity ?? undefined,
    priceOnRequest ? undefined : selectedQuantityOption?.price,
    priceOnRequest ? undefined : currency,
    isOnSale ? displayPrice : undefined
  );
  const whatsappHref = buildWhatsAppOrderLink(
    priceOnRequest
      ? t("whatsappPriceMessage", { productName: productLabel, url: product.url ?? "" })
      : product.url
        ? t("whatsappMessageWithLink", { productName: productLabel, url: product.url })
        : t("whatsappMessage", { productName: productLabel })
  );

  return (
    <div ref={optionsRef} className="space-y-5">
      {priceOnRequest ? (
        <p className="inline-flex rounded-full bg-terracotta-wash px-4 py-2 font-inter text-base font-semibold text-terracotta">
          {t("priceOnRequest")}
        </p>
      ) : isOnSale ? (
        <div className="flex flex-wrap items-baseline gap-3">
          <p className="font-inter text-lg text-muted line-through">
            {currency} {product.price.toLocaleString()}
          </p>
          <p className="font-inter text-3xl font-bold text-terracotta" aria-live="polite">
            {currency} {displayPrice.toLocaleString()}
          </p>
          <span className="rounded-full bg-terracotta px-3 py-1 font-inter text-xs font-bold text-on-accent">
            {t("discountBadge", { percent: discountPercent(product.price, displayPrice) })}
          </span>
        </div>
      ) : (
        <p className="font-inter text-3xl font-bold text-cream" aria-live="polite">
          {showStartingFrom && <span className="me-1.5 text-base font-normal text-muted">{t("startingFrom")}</span>}
          {currency} {displayPrice.toLocaleString()}
        </p>
      )}

      {hasSizes && (
        <div>
          <p className="mb-2.5 font-inter text-sm font-semibold text-cream">
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
                  "min-h-11 rounded-xl px-4 py-2 font-inter text-sm transition-[box-shadow,background-color,color] duration-200",
                  selectedSize === size
                    ? "bg-surface font-semibold text-cream shadow-glow-gold ring-2 ring-gold-line"
                    : "bg-surface text-cream-secondary ring-1 ring-line hover:text-cream hover:ring-gold-line/60"
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
          <p className="mb-2.5 font-inter text-sm font-semibold text-cream">
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
                  "min-h-11 rounded-xl px-4 py-2 font-inter text-sm transition-[box-shadow,background-color,color] duration-200",
                  selectedColor === color
                    ? "bg-surface font-semibold text-cream shadow-glow-gold ring-2 ring-gold-line"
                    : "bg-surface text-cream-secondary ring-1 ring-line hover:text-cream hover:ring-gold-line/60"
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
          <p className="mb-2.5 font-inter text-sm font-semibold text-cream">
            {optionLabel ? t("selectOption", { label: optionLabel }) : t("selectQuantity")}
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
                  "min-h-11 rounded-xl px-4 py-2 font-inter text-sm transition-[box-shadow,background-color,color] duration-200",
                  selectedQuantity === q.label
                    ? "bg-surface font-semibold text-cream shadow-glow-gold ring-2 ring-gold-line"
                    : "bg-surface text-cream-secondary ring-1 ring-line hover:text-cream hover:ring-gold-line/60"
                )}
              >
                {priceOnRequest || q.price <= 0 ? q.label : `${q.label} — ${currency} ${q.price.toLocaleString()}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="font-inter text-sm font-semibold text-terracotta-deep">
          {error}
        </p>
      )}

      <div ref={actionsRef} className="flex flex-col gap-2.5">
        <Button
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          variant="whatsapp"
          size="lg"
          className="w-full"
          onClick={handleWhatsAppClick}
        >
          <MessageCircle size={20} />
          {t("orderWhatsapp")}
        </Button>
        {!priceOnRequest && (
          <Button
            variant="secondary"
            size="lg"
            onClick={handleAddToCart}
            className="w-full"
          >
            {justAdded ? <Check size={20} /> : <ShoppingBag size={20} />}
            {justAdded ? tCart("added") : tCart("addToCart")}
          </Button>
        )}
      </div>

      {/* Sticky order bar (phones) */}
      <div
        inert={!showBar}
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[var(--t-header-bg)] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl backdrop-saturate-150 transition-[translate,opacity] duration-300 ease-soft lg:hidden",
          showBar ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"
        )}
      >
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-inter text-xs text-muted">{product.name}</p>
            {priceOnRequest ? (
              <p className="font-inter text-sm font-semibold text-gold">{t("priceOnRequest")}</p>
            ) : (
              <p className="font-inter text-base font-bold text-cream">
                {showStartingFrom && <span className="me-1 text-xs font-normal text-muted">{t("startingFrom")}</span>}
                {currency} {displayPrice.toLocaleString()}
              </p>
            )}
          </div>
          <Button
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            variant="whatsapp"
            size="md"
            className="shrink-0"
            onClick={handleWhatsAppClick}
          >
            <MessageCircle size={18} />
            {priceOnRequest ? t("askPrice") : t("orderWhatsapp")}
          </Button>
        </div>
      </div>
    </div>
  );
}
