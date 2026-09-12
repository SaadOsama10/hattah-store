"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  buildCartLineId,
  type CartItem,
  readCartFromStorage,
  writeCartToStorage,
} from "@/lib/cart";

export type AddCartItemInput = Omit<CartItem, "quantity" | "lineId">;

interface CartContextValue {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: AddCartItemInput, quantity?: number) => void;
  removeItem: (lineId: string) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
  totalCount: number;
  subtotal: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Read the persisted cart once on mount (client only — localStorage
  // doesn't exist during SSR).
  useEffect(() => {
    setItems(readCartFromStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) writeCartToStorage(items);
  }, [items, hydrated]);

  const addItem = useCallback((item: AddCartItemInput, quantity = 1) => {
    const lineId = buildCartLineId(item.id, item.size, item.color);
    setItems((prev) => {
      const existing = prev.find((p) => p.lineId === lineId);
      if (existing) {
        return prev.map((p) =>
          p.lineId === lineId ? { ...p, quantity: p.quantity + quantity } : p
        );
      }
      return [...prev, { ...item, lineId, quantity }];
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((lineId: string) => {
    setItems((prev) => prev.filter((p) => p.lineId !== lineId));
  }, []);

  const setQuantity = useCallback((lineId: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((p) => p.lineId !== lineId);
      return prev.map((p) => (p.lineId === lineId ? { ...p, quantity } : p));
    });
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem,
      removeItem,
      setQuantity,
      clearCart,
      totalCount,
      subtotal,
    }),
    [items, isOpen, addItem, removeItem, setQuantity, clearCart, totalCount, subtotal]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
