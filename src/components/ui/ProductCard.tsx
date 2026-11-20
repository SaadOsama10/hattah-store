"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Check, ImageOff, MessageCircle, ShoppingBag } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/contexts/CartContext";
import { playClick } from "@/lib/sound";
import { buildWhatsAppOrderLink } from "@/lib/whatsapp";
import { isProductOnSale, effectivePrice, discountPercent } from "@/lib/supabase/types";
import type { CardProduct } from "@/lib/storefront";
import { cn } from "@/lib/cn";

// Whether this device can hover (desktop) — decided once, shared by all cards.
let hoverCapable: boolean | null = null;

/**
 * Product card.
 *  - Second photo cross-fades in on hover (hover-capable devices only; it
 *    isn't even requested on phones).
 *  - Price on request → a pill instead of any price, never a cart button.
 *  - Priced options with different prices → "From X".
 *  - Quick WhatsApp order on every card (ready message: name + link).
 *  - Quick add-to-cart only for a priced product with no option to choose.
 */
export function ProductCard({
  product,
  priority = false,
  className,
  showFeatured = true,
}: {
  product: CardProduct;
  priority?: boolean;
  className?: string;
  /** false inside the "featured" section, where the badge would only repeat its title */
  showFeatured?: boolean;
}) {
  const t = useTranslations("common");
  const tCart = useTranslations("cart");
  const tProduct = useTranslations("product");
  const { addItem } = useCart();
  const [showSecond, setShowSecond] = useState(false);
  const [added, setAdded] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(priority);

  useEffect(() => {
    if (!product.image2) return;
    if (hoverCapable === null) hoverCapable = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    setShowSecond(hoverCapable);
  }, [product.image2]);

  const { price, salePrice, priceOnRequest } = product;
  const onSale = !priceOnRequest && isProductOnSale(price, salePrice);
  const charged = effectivePrice(price, salePrice);
  const canQuickAdd = !priceOnRequest && !product.needsOptions && price > 0;
  const href = `/product/${product.slug}`;

  const whatsappHref = buildWhatsAppOrderLink(
    priceOnRequest
      ? tProduct("whatsappPriceMessage", { productName: product.name, url: product.url })
      : tProduct("whatsappMessageWithLink", { productName: product.name, url: product.url })
  );

  function quickAdd() {
    if (!canQuickAdd) return;
    playClick();
    addItem({
      id: product.id,
      name: product.name,
      price: charged,
      image: product.image,
      ...(onSale ? { originalPrice: price } : {}),
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  }

  return (
    <article className={cn("group relative flex h-full flex-col", className)}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-bg-secondary">
        {!imgLoaded && product.image && <div aria-hidden className="skeleton absolute inset-0" />}
        {product.image ? (
          <>
            <Image
              src={product.image}
              alt={product.imageAlt}
              fill
              sizes="(min-width: 1280px) 300px, (min-width: 1024px) 24vw, (min-width: 640px) 33vw, 50vw"
              priority={priority}
              fetchPriority={priority ? "high" : "auto"}
              onLoad={() => setImgLoaded(true)}
              className={cn(
                "object-cover transition-[transform,opacity] duration-700 ease-soft group-hover:scale-[1.03]",
                !priority && (imgLoaded ? "opacity-100" : "opacity-0")
              )}
            />
            {showSecond && product.image2 && (
              <Image
                src={product.image2}
                alt=""
                aria-hidden
                fill
                sizes="(min-width: 1280px) 300px, (min-width: 1024px) 24vw, 33vw"
                className="object-cover opacity-0 transition-opacity duration-500 ease-soft group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            <ImageOff size={30} strokeWidth={1.5} />
          </div>
        )}

        {/* Badges only from real data: sale price, admin "featured" flag, added recently. */}
        <div className="absolute start-2.5 top-2.5 flex flex-col items-start gap-1">
          {onSale && (
            <span className="rounded-full bg-terracotta px-2.5 py-1 font-inter text-[11px] font-bold text-on-accent">
              {tProduct("discountBadge", { percent: discountPercent(price, salePrice as number) })}
            </span>
          )}
          {product.isNew ? (
            <span className="rounded-full bg-surface/90 px-2.5 py-1 font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-cream backdrop-blur-sm">
              {tProduct("badgeNew")}
            </span>
          ) : product.featured && showFeatured ? (
            <span className="rounded-full bg-surface/90 px-2.5 py-1 font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-cream backdrop-blur-sm">
              {tProduct("badgeFeatured")}
            </span>
          ) : null}
        </div>

        {/* Quick actions sit above the card's stretched link. */}
        <div className="card-actions absolute bottom-2.5 end-2.5 z-10 flex gap-1.5">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playClick()}
            aria-label={tProduct("quickWhatsapp", { name: product.name })}
            title={tProduct("orderWhatsapp")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-forest text-on-accent shadow-card transition-transform duration-300 hover:scale-105"
          >
            <MessageCircle size={18} strokeWidth={2} />
          </a>
          {canQuickAdd && (
            <button
              type="button"
              onClick={quickAdd}
              aria-label={tProduct("quickAdd", { name: product.name })}
              title={tCart("addToCart")}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-surface/90 text-cream shadow-card ring-1 ring-line backdrop-blur-sm transition-transform duration-300 hover:scale-105"
            >
              {added ? <Check size={18} strokeWidth={2} className="text-forest" /> : <ShoppingBag size={18} strokeWidth={1.75} />}
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-1 flex-col gap-1 px-0.5">
        <h3 className="line-clamp-2 font-inter text-[15px] font-semibold leading-snug text-cream">
          <Link
            href={href}
            className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-500 ease-soft after:absolute after:inset-0 after:rounded-card after:content-[''] group-hover:bg-[length:100%_1px]"
          >
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto pt-1">
          {priceOnRequest ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-playfair text-sm italic text-cream-secondary">{tProduct("priceOnRequest")}</span>
              {/* above the stretched link */}
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => playClick()}
                className="relative z-10 inline-flex min-h-9 items-center gap-1 font-inter text-xs font-semibold text-cream underline underline-offset-4 hover:text-terracotta"
              >
                <MessageCircle size={14} />
                {tProduct("askPrice")}
              </a>
            </div>
          ) : onSale ? (
            <p className="flex flex-wrap items-baseline gap-x-2 font-inter text-sm">
              <span className="font-bold text-terracotta">
                {t("currency")} {charged.toLocaleString()}
              </span>
              <span className="text-muted line-through">
                {t("currency")} {price.toLocaleString()}
              </span>
            </p>
          ) : (
            <p className="font-inter text-[15px] font-bold tracking-tight text-cream">
              {product.startingFrom && <span className="me-1 text-xs font-normal text-muted">{tProduct("startingFrom")}</span>}
              {t("currency")} {price.toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

/** Placeholder while a grid loads — same footprint as a card. */
export function ProductCardSkeleton() {
  return (
    <div aria-hidden className="flex flex-col">
      <div className="skeleton aspect-[4/5] rounded-card" />
      <div className="skeleton mt-3 h-3 w-1/3 rounded-full" />
      <div className="skeleton mt-2 h-4 w-4/5 rounded-full" />
      <div className="skeleton mt-2 h-4 w-1/4 rounded-full" />
    </div>
  );
}
