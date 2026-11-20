"use client";

import Image from "next/image";
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
        price: i.price,
        originalPrice: i.originalPrice,
        size: i.size,
        color: i.color,
        quantityOption: i.quantityOption,
        optionLabel: i.optionLabel,
      })),
      t("checkoutMessageIntro"),
      t("checkoutMessageTotal", { total: `${currency} ${subtotal.toLocaleString()}` }),
      tProduct("sizeLabel"),
      tProduct("colorLabel"),
      tProduct("quantityLabel"),
      currency
    );
    window.open(href, "_blank", "noopener,noreferrer");
  }

  return (
    <>
          {/* CSS-only open/close (no animation library): always mounted, inert while closed */}
          <div
            onClick={closeCart}
            aria-hidden
            className={`fixed inset-0 z-[60] bg-[var(--tile-overlay)]/45 backdrop-blur-sm transition-opacity duration-300 ${
              isOpen ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("title")}
            inert={!isOpen}
            className={`fixed inset-y-0 end-0 z-[70] flex w-full max-w-md flex-col border-s border-line bg-bg-primary shadow-lift transition-[translate,visibility] duration-[350ms] ease-soft ${
              isOpen ? "visible translate-x-0" : `invisible ${locale === "ar" ? "-translate-x-full" : "translate-x-full"}`
            }`}
          >
            <div className="relative flex items-center justify-between border-b border-line px-6 py-5">
              <h2 className="flex items-center gap-2 font-playfair text-xl font-bold text-cream">
                <ShoppingBag size={20} className="text-cream" />
                {t("title")}
              </h2>
              <button
                type="button"
                onClick={closeCart}
                aria-label={tCommon("close")}
                className="flex h-11 w-11 items-center justify-center rounded-full text-cream-secondary transition-colors hover:bg-cream/8 hover:text-cream"
              >
                <X size={18} />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-bg-secondary ring-1 ring-line-strong"><ShoppingBag size={32} strokeWidth={1.25} className="text-cream" /></span>
                <p className="font-playfair text-xl font-bold text-cream">{t("empty")}</p>
                <p className="font-inter text-sm text-muted">{t("emptyHint")}</p>
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
                          className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-bg-secondary ring-1 ring-line"
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
                              {(item.size || item.color || item.quantityOption) && (
                                <span className="mt-0.5 font-inter text-xs text-muted">
                                  {[
                                    item.size && `${tProduct("sizeLabel")}: ${item.size}`,
                                    item.color && `${tProduct("colorLabel")}: ${item.color}`,
                                    item.quantityOption &&
                                      `${item.optionLabel ?? tProduct("quantityLabel")}: ${item.quantityOption}`,
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
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:text-terracotta-deep"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 rounded-full border border-line-strong px-1 py-0.5">
                              <button
                                type="button"
                                onClick={() => setQuantity(item.lineId, item.quantity - 1)}
                                aria-label={t("decreaseQuantity")}
                                className="flex h-9 w-9 items-center justify-center rounded-full text-cream-secondary transition-colors hover:bg-cream/8 hover:text-cream"
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
                                className="flex h-9 w-9 items-center justify-center rounded-full text-cream-secondary transition-colors hover:bg-cream/8 hover:text-cream"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                            <span className="flex items-baseline gap-1.5 font-inter text-sm">
                              {item.originalPrice != null && (
                                <span className="text-muted line-through">
                                  {currency} {(item.originalPrice * item.quantity).toLocaleString()}
                                </span>
                              )}
                              <span
                                className={
                                  item.originalPrice != null
                                    ? "font-semibold text-terracotta"
                                    : "text-cream-secondary/80"
                                }
                              >
                                {currency} {(item.price * item.quantity).toLocaleString()}
                              </span>
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-line bg-bg-secondary px-6 py-5">
                  <div className="mb-4 flex items-center justify-between font-inter text-cream">
                    <span className="text-eyebrow font-semibold uppercase tracking-[0.2em] text-cream">
                      {t("subtotal")}
                    </span>
                    <span className="font-playfair text-2xl font-bold">
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
          </div>
    </>
  );
}
