"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ImageOff, ShoppingBag } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/contexts/CartContext";
import { playClick } from "@/lib/sound";

export function ProductCard({
  id,
  name,
  price,
  image,
  categoryLabel,
  hasVariants = false,
}: {
  id: string;
  name: string;
  price: number;
  image: string | undefined;
  categoryLabel?: string;
  // When true, the product needs a size/color chosen before it can be
  // added — the quick-add icon just follows the card's Link to the
  // product page instead of silently adding without a selection.
  hasVariants?: boolean;
}) {
  const t = useTranslations("common");
  const tCart = useTranslations("cart");
  const { addItem } = useCart();

  function handleAddToCart(e: React.MouseEvent) {
    if (hasVariants) return;
    e.preventDefault();
    e.stopPropagation();
    playClick();
    addItem({ id, name, price, image });
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
          <p className="font-inter text-sm text-cream-secondary/80">
            {t("currency")} {price.toLocaleString()}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
