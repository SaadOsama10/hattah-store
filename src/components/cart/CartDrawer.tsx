"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/contexts/CartContext";
import { buildWhatsAppCartLink } from "@/lib/whatsapp";
import type { Locale } from "@/lib/supabase/types";

export function CartDrawer() {
  const t = useTranslations("cart");
  const tProduct = useTranslations("product");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;
  const { items, isOpen, closeCart, removeItem, setQuantity, subtotal } = useCart();

  const currency = tCommon("currency");

  function handleCheckout() {
    const href = buildWhatsAppCartLink(
      items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        size: i.size,
        color: i.color,
      })),
      t("checkoutMessageIntro"),
      t("checkoutMessageTotal", { total: `${currency} ${subtotal.toLocaleString()}` }),
      tProduct("sizeLabel"),
      tProduct("colorLabel")
    );
    window.open(href, "_blank", "noopener,noreferrer");
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeCart}
            className="fixed inset-0 z-[60] bg-bg-primary/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: locale === "ar" ? "-100%" : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: locale === "ar" ? "-100%" : "100%" }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-y-0 end-0 z-[70] flex w-full max-w-md flex-col border-s border-cream/10 bg-bg-secondary shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-cream/10 px-6 py-5">
              <h2 className="flex items-center gap-2 font-playfair text-xl font-bold text-cream">
                <ShoppingBag size={20} className="text-terracotta" />
                {t("title")}
              </h2>
              <button
                type="button"
                onClick={closeCart}
                aria-label={tCommon("close")}
                className="flex h-9 w-9 items-center justify-center rounded-full text-cream-secondary transition-colors hover:bg-cream/10 hover:text-cream"
              >
                <X size={18} />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                <ShoppingBag size={40} className="text-cream-secondary/25" />
                <p className="font-inter text-cream">{t("empty")}</p>
                <p className="font-inter text-sm text-cream-secondary/60">{t("emptyHint")}</p>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={closeCart}
                  className="mt-2"
                >
                  {t("continueShopping")}
                </Button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  <ul className="space-y-5">
                    {items.map((item) => (
                      <li key={item.lineId} className="flex gap-4">
                        <Link
                          href={`/product/${item.id}`}
                          onClick={closeCart}
                          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-bg-primary"
                        >
                          {item.image && (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          )}
                        </Link>

                        <div className="flex flex-1 flex-col justify-between">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-col">
                              <Link
                                href={`/product/${item.id}`}
                                onClick={closeCart}
                                className="font-inter text-sm font-semibold text-cream transition-colors hover:text-terracotta"
                              >
                                {item.name}
                              </Link>
                              {(item.size || item.color) && (
                                <span className="mt-0.5 font-inter text-xs text-cream-secondary/60">
                                  {[
                                    item.size && `${tProduct("sizeLabel")}: ${item.size}`,
                                    item.color && `${tProduct("colorLabel")}: ${item.color}`,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(item.lineId)}
                              aria-label={t("remove")}
                              className="shrink-0 text-cream-secondary/50 transition-colors hover:text-terracotta-deep"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 rounded-full border border-cream/15 px-2 py-1">
                              <button
                                type="button"
                                onClick={() => setQuantity(item.lineId, item.quantity - 1)}
                                aria-label={t("decreaseQuantity")}
                                className="flex h-6 w-6 items-center justify-center rounded-full text-cream-secondary transition-colors hover:bg-cream/10 hover:text-cream"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="w-5 text-center font-inter text-sm text-cream">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => setQuantity(item.lineId, item.quantity + 1)}
                                aria-label={t("increaseQuantity")}
                                className="flex h-6 w-6 items-center justify-center rounded-full text-cream-secondary transition-colors hover:bg-cream/10 hover:text-cream"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                            <span className="font-inter text-sm text-cream-secondary/80">
                              {currency} {(item.price * item.quantity).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-cream/10 px-6 py-5">
                  <div className="mb-4 flex items-center justify-between font-inter text-cream">
                    <span className="text-sm uppercase tracking-widest text-cream-secondary/60">
                      {t("subtotal")}
                    </span>
                    <span className="text-lg font-bold">
                      {currency} {subtotal.toLocaleString()}
                    </span>
                  </div>
                  <Button
                    variant="whatsapp"
                    size="lg"
                    onClick={handleCheckout}
                    className="w-full"
                  >
                    {t("checkoutWhatsapp")}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
