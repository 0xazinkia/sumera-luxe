import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart";
import { siteSettingsQuery } from "@/lib/queries";
import { requestBeginCheckoutIntent } from "@/tracking";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Bag — Suméra Luxe" },
      { name: "description", content: "Review the pieces in your Suméra Luxe bag before checkout." },
      { property: "og:title", content: "Your Bag — Suméra Luxe" },
      { property: "og:description", content: "Review your bag." },
      { property: "og:url", content: "https://sumeraluxe.com/cart" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://sumeraluxe.com/cart" }],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, subtotal, setQty, remove } = useCart();
  const settingsQuery = useQuery(siteSettingsQuery());
  const settings = settingsQuery.data ?? null;
  const isSettingsLoading = settingsQuery.isPending || settingsQuery.isFetching;
  const currency = settings?.currency_symbol ?? "Tk. ";
  const brandName = settings?.brand_name ?? "Suméra Luxe";

  const handleBeginCheckout = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (items.length === 0) {
      event.preventDefault();
      return;
    }

    // Only registers intent — checkout.tsx fires the single, deduplicated
    // begin_checkout/InitiateCheckout event once the user actually lands there.
    requestBeginCheckoutIntent();
  };

  if (isSettingsLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-14 md:px-8 md:py-20">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-3 w-24 animate-pulse rounded-full bg-muted/70" />
          <div className="mx-auto h-8 w-2/3 animate-pulse rounded bg-muted/70" />
        </div>
        <div className="mt-12 space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex gap-4 rounded-sm border border-border/60 p-4">
              <div className="h-24 w-24 animate-pulse rounded-sm bg-muted/70" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/2 animate-pulse rounded bg-muted/70" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted/50" />
                <div className="h-4 w-1/3 animate-pulse rounded bg-muted/50" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 md:px-8 md:py-20">
      <div className="text-center">
        <div className="text-[11px] uppercase tracking-[0.35em] text-gold">Your Bag</div>
        <h1 className="mt-2 font-serif text-4xl">Shopping Bag</h1>
        <div className="gold-rule mt-4" />
      </div>

      {items.length === 0 ? (
        <div className="mt-16 text-center text-muted-foreground">
          <p>Your bag is currently empty.</p>
          <Link to="/products" search={{ q: undefined }} className="mt-6 inline-block bg-foreground px-6 py-3 text-xs uppercase tracking-[0.25em] text-background hover:bg-foreground/85">
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_360px]">
          <div className="divide-y divide-border border-y border-border">
            {items.map((l) => (
              <div key={`${l.productId}_${l.variantId ?? ""}`} className="flex gap-4 py-6">
                <img src={l.image} alt={l.name} className="h-24 w-24 shrink-0 rounded-sm object-cover md:h-28 md:w-28" />
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link to="/products/$slug" params={{ slug: l.slug }} className="font-serif text-lg hover:text-gold">
                        {l.name}
                      </Link>
                      {l.variantLabel && (
                        <div className="text-xs text-muted-foreground">{l.variantLabel}</div>
                      )}
                    </div>
                    <button
                      onClick={() => remove(l.productId, l.variantId)}
                      aria-label="Remove"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <div className="flex items-center border border-border">
                      <button onClick={() => setQty(l.productId, l.variantId, l.quantity - 1)} className="px-3 py-1.5">−</button>
                      <span className="w-8 text-center text-sm">{l.quantity}</span>
                      <button onClick={() => setQty(l.productId, l.variantId, l.quantity + 1)} className="px-3 py-1.5">+</button>
                    </div>
                    <div className="text-sm font-medium">
                      {currency}{(l.unitPrice * l.quantity).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="h-fit border border-border bg-card p-6">
            <h2 className="font-serif text-xl">Order Summary</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{currency}{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Shipping</span>
                <span>Calculated at checkout</span>
              </div>
            </div>
            <div className="mt-4 flex justify-between border-t border-border pt-4 font-serif text-lg">
              <span>Total</span>
              <span>{currency}{subtotal.toLocaleString()}</span>
            </div>
            <Link
              to="/checkout"
              onClick={handleBeginCheckout}
              className="mt-6 inline-flex w-full items-center justify-center bg-foreground px-6 py-3 text-xs uppercase tracking-[0.25em] text-background hover:bg-foreground/85"
            >
              Proceed to Checkout
            </Link>
            <Link
              to="/products"
              search={{ q: undefined }}
              className="mt-3 inline-flex w-full items-center justify-center border border-border px-6 py-3 text-xs uppercase tracking-[0.25em] hover:border-foreground"
            >
              Continue Shopping
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}