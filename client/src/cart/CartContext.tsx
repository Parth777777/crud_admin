/**
 * CART CONTEXT  (local-only state, until you "checkout")
 * ------------------------------------------------------
 * The cart lives purely in the browser (React state + localStorage). Nothing
 * touches the database until you press Checkout, which POSTs the cart to
 * /api/orders and creates a real Order row. This shows the difference between
 * transient UI state and persisted server state.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface CartLine {
  mealId: string;
  mealName: string;
  mealThumb: string;
  price: number;
  qty: number;
}

interface CartState {
  lines: CartLine[];
  add: (line: Omit<CartLine, "qty">) => void;
  setQty: (mealId: string, qty: number) => void;
  remove: (mealId: string) => void;
  clear: () => void;
  total: number;
  count: number;
}

const CartContext = createContext<CartState | null>(null);
const STORAGE_KEY = "foodly_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });

  // Persist the cart so a refresh doesn't lose it.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines]);

  function add(line: Omit<CartLine, "qty">) {
    setLines((prev) => {
      const existing = prev.find((l) => l.mealId === line.mealId);
      if (existing) {
        return prev.map((l) => (l.mealId === line.mealId ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...prev, { ...line, qty: 1 }];
    });
  }

  function setQty(mealId: string, qty: number) {
    if (qty <= 0) return remove(mealId);
    setLines((prev) => prev.map((l) => (l.mealId === mealId ? { ...l, qty } : l)));
  }

  function remove(mealId: string) {
    setLines((prev) => prev.filter((l) => l.mealId !== mealId));
  }

  function clear() {
    setLines([]);
  }

  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);

  return (
    <CartContext.Provider value={{ lines, add, setQty, remove, clear, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
