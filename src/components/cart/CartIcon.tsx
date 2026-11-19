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
        "relative flex h-11 w-11 items-center justify-center rounded-full text-cream transition-colors duration-300 hover:bg-cream/8",
        className
      )}
    >
      <ShoppingBag size={19} strokeWidth={1.75} />
      {totalCount > 0 && (
        <span className="absolute end-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-terracotta px-1 font-inter text-[10px] font-bold leading-none text-on-accent">
          {totalCount > 99 ? "99+" : totalCount}
        </span>
      )}
    </button>
  );
}
