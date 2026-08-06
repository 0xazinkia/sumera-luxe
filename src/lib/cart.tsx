import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

// A cart line stores a snapshot of the product/variant at add-time so the cart
// keeps working across route changes without re-fetching the catalog.
export type CartItem = {
  productId: string;
  variantId?: string;
  slug: string;
  name: string;
  image: string;
  variantLabel?: string;
  unitPrice: number;
  quantity: number;
};

type CartCtx = {
  items: CartItem[];
  subtotal: number;
  count: number;
  add: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  remove: (productId: string, variantId?: string) => void;
  setQty: (productId: string, variantId: string | undefined, quantity: number) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
const STORAGE = "sumera_cart_v2";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE, JSON.stringify(items));
    } catch {}
  }, [items, hydrated]);

  const value = useMemo<CartCtx>(() => {
    const subtotal = items.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    const count = items.reduce((s, l) => s + l.quantity, 0);

    return {
      items,
      subtotal,
      count,
      add: (input) => {
        setItems((prev) => {
          const qty = input.quantity ?? 1;
          const idx = prev.findIndex(
            (p) => p.productId === input.productId && p.variantId === input.variantId,
          );
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
            return next;
          }
          return [...prev, { ...input, quantity: qty }];
        });
      },
      remove: (productId, variantId) =>
        setItems((prev) =>
          prev.filter((p) => !(p.productId === productId && p.variantId === variantId)),
        ),
      setQty: (productId, variantId, quantity) =>
        setItems((prev) =>
          prev
            .map((p) =>
              p.productId === productId && p.variantId === variantId
                ? { ...p, quantity: Math.max(1, quantity) }
                : p,
            )
            .filter((p) => p.quantity > 0),
        ),
      clear: () => setItems([]),
    };
  }, [items]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}