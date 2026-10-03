"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ImageOff, ShoppingBag } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/contexts/CartContext";
import { playClick } from "@/lib/sound";
import { isProductOnSale, effectivePrice, discountPercent } from "@/lib/supabase/types";

export function ProductCard({
  id,
  name,
  price,
  salePrice = null,
  image,
  categoryLabel,
  hasVariants = false,
  startingFrom = false,
}: {
  id: string;
  name: string;
  price: number;
  salePrice?: number | null;
  image: string | undefined;
  categoryLabel?: string;
  // When true, `price` is the cheapest of several quantity options rather
  // than a single fixed price — shown with the "starting from" prefix.
  startingFrom?: boolean;
  // When true, the product needs a size/color chosen before it can be
  // added — the quick-add icon just follows the card's Link to the
  // product page instead of silently adding without a selection.
  hasVariants?: boolean;
}) {
  const t = useTranslations("common");
  const tCart = useTranslations("cart");
  const tProduct = useTranslations("product");
  const { addItem } = useCart();

  const onSale = isProductOnSale(price, salePrice);
  const chargedPrice = effectivePrice(price, salePrice);

  function handleAddToCart(e: React.MouseEvent) {
    if (hasVariants) return;
    e.preventDefault();
    e.stopPropagation();
    playClick();
    addItem({
      id,
      name,
      price: chargedPrice,
      image,
      ...(onSale ? { originalPrice: price } : {}),
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="group"
    >
      <Link href={`/product/${id}`} className="block">
        <div className="border-gradient relative aspect-[4/5] overflow-hidden rounded-2xl bg-bg-secondary transition-shadow duration-500 group-hover:shadow-soft">
          {image ? (
            <Image
              src={image}
              alt={name}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 45vw, 90vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-cream/20">
              <ImageOff size={32} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/60 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          {categoryLabel && (
            <span className="absolute start-3 top-3 rounded-full bg-bg-primary/70 px-3 py-1 text-[10px] font-inter uppercase tracking-widest text-cream-secondary backdrop-blur-sm">
              {categoryLabel}
            </span>
          )}
          {onSale && (
            <span className="absolute end-3 top-3 rounded-full bg-terracotta px-3 py-1 text-[10px] font-inter font-bold uppercase tracking-widest text-cream shadow-glow-terracotta">
              {tProduct("discountBadge", { percent: discountPercent(price, salePrice as number) })}
            </span>
          )}
          <button
            type="button"
            onClick={handleAddToCart}
            aria-label={tCart("addToCart")}
            className="absolute bottom-3 end-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-bg-primary/80 text-cream backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-terracotta"
          >
            <ShoppingBag size={16} />
          </button>
        </div>
        <div className="mt-4 space-y-1">
          <h3 className="font-playfair text-lg font-bold text-cream transition-colors duration-300 group-hover:text-terracotta">
            {name}
          </h3>
          {onSale ? (
            <p className="flex items-baseline gap-2 font-inter text-sm">
              <span className="text-cream-secondary/50 line-through">
                {t("currency")} {price.toLocaleString()}
              </span>
              <span className="font-semibold text-terracotta">
                {t("currency")} {chargedPrice.toLocaleString()}
              </span>
            </p>
          ) : (
            <p className="font-inter text-sm text-cream-secondary/80">
              {startingFrom && (
                <span className="me-1.5 text-xs text-cream-secondary/60">{tProduct("startingFrom")}</span>
              )}
              {t("currency")} {price.toLocaleString()}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
