import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PackageSearch, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/lib/hooks";

type TrackedItem = {
  name: string;
  variant: string | null;
  quantity: number;
  unit_price: number;
  image: string | null;
};

type TrackedOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  address: string;
  city: string;
  area: string;
  subtotal: number;
  delivery_fee: number;
  discount_amount: number;
  total: number;
  status: string;
  created_at: string;
  items: TrackedItem[];
};

const STATUS_STEPS = ["pending", "confirmed", "shipped", "delivered"] as const;

const STATUS_LABELS: Record<string, string> = {
  pending: "Order Placed",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Track Your Order in Bangladesh — Suméra Luxe" },
      { name: "description", content: "Track your Suméra Luxe order in Bangladesh using your phone number — see status from Dhaka to nationwide delivery." },
      { property: "og:title", content: "Track Your Order in Bangladesh — Suméra Luxe" },
      { property: "og:description", content: "Look up your Suméra Luxe order status by phone number in Bangladesh." },
      { property: "og:locale", content: "en_BD" },
      { property: "og:url", content: "https://sumeraluxe.com/track" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://sumeraluxe.com/track" }],
  }),
  component: TrackPage,
});

function TrackPage() {
  const settings = useSiteSettings();
  const currency = settings?.currency_symbol ?? "Tk. ";
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<TrackedOrder[] | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOrders(null);
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 6) {
      setError("Please enter a valid phone number.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("track_orders_by_phone" as any, { _phone: phone });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setOrders((data ?? []) as TrackedOrder[]);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 md:px-8 md:py-20">
      <div className="text-center">
        <div className="text-[11px] uppercase tracking-[0.35em] text-gold">Order Status</div>
        <h1 className="mt-2 font-serif text-4xl">Track Your Order</h1>
        <div className="gold-rule mt-4" />
        <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
          Enter the phone number you used at checkout to see your orders.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mx-auto mt-10 flex max-w-lg gap-2">
        <label htmlFor="track-phone" className="sr-only">Phone number</label>
        <input
          id="track-phone"
          name="phone"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number (e.g. 01322126233)"
          className="flex-1 border border-border bg-background px-4 py-3 text-sm outline-none focus:border-foreground"
          inputMode="tel"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 bg-foreground px-5 py-3 text-xs uppercase tracking-[0.25em] text-background hover:bg-foreground/85 disabled:opacity-60"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <PackageSearch className="size-4" />}
          Track
        </button>
      </form>

      {error && <p className="mt-6 text-center text-sm text-destructive">{error}</p>}

      {orders && orders.length === 0 && (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          No orders found for that phone number.
        </p>
      )}

      {orders && orders.length > 0 && (
        <div className="mt-10 space-y-6">
          {orders.map((o) => (
            <OrderCard key={o.id} order={o} currency={currency} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, currency }: { order: TrackedOrder; currency: string }) {
  const cancelled = order.status === "cancelled";
  const currentIndex = STATUS_STEPS.indexOf(order.status as (typeof STATUS_STEPS)[number]);

  return (
    <article className="border border-border bg-card p-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Order</div>
          <div className="font-serif text-xl">{order.order_number}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleString()}
          </div>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.25em] ${
            cancelled ? "bg-destructive/10 text-destructive" : "bg-gold/15 text-gold"
          }`}
        >
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </header>

      {!cancelled && (
        <ol className="mt-5 grid grid-cols-4 gap-2">
          {STATUS_STEPS.map((step, i) => {
            const done = i <= currentIndex;
            return (
              <li key={step} className="flex flex-col items-center gap-2 text-center">
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full border text-xs ${
                    done ? "border-gold bg-gold text-primary-foreground" : "border-border text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </span>
                <span className={`text-[10px] uppercase tracking-[0.2em] ${done ? "text-foreground" : "text-muted-foreground"}`}>
                  {STATUS_LABELS[step]}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-6 divide-y divide-border">
        {order.items.map((it, i) => (
          <div key={i} className="flex gap-3 py-3">
            {it.image && <img src={it.image} alt={it.name} className="h-14 w-14 rounded-sm object-cover" />}
            <div className="flex-1 text-sm">
              <div className="font-medium">{it.name}</div>
              {it.variant && <div className="text-xs text-muted-foreground">{it.variant}</div>}
              <div className="text-xs text-muted-foreground">
                Qty {it.quantity} × {currency}{Number(it.unit_price).toLocaleString()}
              </div>
            </div>
            <div className="text-sm font-medium">
              {currency}{(Number(it.unit_price) * it.quantity).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <dl className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <dt>Subtotal</dt>
          <dd>{currency}{Number(order.subtotal).toLocaleString()}</dd>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <dt>Delivery</dt>
          <dd>{currency}{Number(order.delivery_fee).toLocaleString()}</dd>
        </div>
        {Number(order.discount_amount) > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <dt>Discount</dt>
            <dd>−{currency}{Number(order.discount_amount).toLocaleString()}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-border pt-2 font-serif text-lg">
          <dt>Total</dt>
          <dd>{currency}{Number(order.total).toLocaleString()}</dd>
        </div>
      </dl>

      <div className="mt-4 text-xs text-muted-foreground">
        Ships to {order.customer_name} · {order.address}, {order.city}
      </div>
    </article>
  );
}