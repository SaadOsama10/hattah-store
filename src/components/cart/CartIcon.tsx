"use client";

import { ShoppingBag } from "lucide-react";
import { cn } from "@/lib/cn";
import { useCart } from "@/contexts/CartContext";

export function CartIcon({ className }: { className?: string }) {
  const { totalCount, openCart } = useCart();

  return (
    <button
      type="button"
      onClick={openCart}
      aria-label="Cart"
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-full border border-cream/25 text-cream transition-all duration-300 hover:scale-105 hover:border-cream hover:bg-cream/5",
        className
      )}
    >
      <ShoppingBag size={15} />
      {totalCount > 0 && (
        <span className="absolute -end-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-terracotta px-1 font-inter text-[10px] font-bold leading-none text-cream">
          {totalCount > 99 ? "99+" : totalCount}
        </span>
      )}
    </button>
  );
}
