import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { CheckCircle2 } from "lucide-react";
import { siteSettingsQuery } from "@/lib/queries";
import { buildPurchasePayload, trackPurchase, type CartLineLike } from "@/tracking";

export const Route = createFileRoute("/order-success")({
  validateSearch: (s: Record<string, unknown>) => ({
    total: Number(s.total) || 0,
    order: typeof s.order === "string" ? s.order : "",
  }),
  head: () => ({
    meta: [
      { title: "Order Placed — Suméra Luxe" },
      { name: "description", content: "Thank you for your Suméra Luxe order — our team will call to confirm delivery details shortly." },
      { property: "og:title", content: "Order Placed — Suméra Luxe" },
      { property: "og:description", content: "Thank you for your Suméra Luxe order — confirmation coming shortly." },
      { property: "og:url", content: "https://sumeraluxe.com/order-success" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://sumeraluxe.com/order-success" }],
  }),
  component: OrderSuccess,
});

function OrderSuccess() {
  const { total, order } = Route.useSearch();
  const settingsQuery = useQuery(siteSettingsQuery());
  const settings = settingsQuery.data ?? null;
  const isSettingsLoading = settingsQuery.isPending || settingsQuery.isFetching;
  const currency = settings?.currency_symbol ?? "Tk. ";
  const purchaseTrackedRef = useRef(false);

  useEffect(() => {
    if (purchaseTrackedRef.current || typeof window === "undefined" || !order) return;

    const raw = window.sessionStorage.getItem("sumera_tracking_pending_purchase");
    if (!raw) return;

    try {
      const pending = JSON.parse(raw);
      if (!pending?.orderNumber || pending.orderNumber !== order) return;

      purchaseTrackedRef.current = true;
      trackPurchase(
        buildPurchasePayload(
          pending.orderNumber,
          Number(pending.total ?? total),
          (pending.items ?? []).map((item: any) => ({
            productId: item.productId,
            name: item.name,
            variantLabel: item.variantLabel,
            unitPrice: Number(item.unitPrice ?? 0),
            quantity: Number(item.quantity ?? 1),
          })),
          settings?.brand_name ?? null,
          typeof window !== "undefined" ? window.location.href : undefined,
        ),
      );
      window.sessionStorage.removeItem("sumera_tracking_pending_purchase");
      window.sessionStorage.removeItem("sumera_tracking_last_purchase");
    } catch {
      purchaseTrackedRef.current = true;
    }
  }, [order, settings?.brand_name, total]);

  if (isSettingsLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <div className="mx-auto h-14 w-14 animate-pulse rounded-full bg-muted/70" />
        <div className="mx-auto mt-6 h-4 w-24 animate-pulse rounded-full bg-muted/70" />
        <div className="mx-auto mt-4 h-8 w-2/3 animate-pulse rounded bg-muted/70" />
        <div className="mx-auto mt-6 h-4 w-full animate-pulse rounded bg-muted/50" />
        <div className="mx-auto mt-3 h-4 w-2/3 animate-pulse rounded bg-muted/50" />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <CheckCircle2 className="mx-auto size-14 text-gold" strokeWidth={1.5} />
      <div className="mt-6 text-[11px] uppercase tracking-[0.35em] text-gold">Merci Beaucoup</div>
      <h1 className="mt-2 font-serif text-4xl">Your order is placed.</h1>
      <div className="gold-rule mt-4" />
      {order && <p className="mt-6 font-mono text-sm">Order #{order}</p>}
      <p className="mt-4 text-muted-foreground">
        A Suméra Luxe advisor will call you shortly to confirm your delivery. Payment is due in cash on arrival.
      </p>
      {total > 0 && (
        <p className="mt-4 font-serif text-2xl">Total · {currency}{total.toLocaleString()}</p>
      )}
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link to="/" className="border border-foreground px-6 py-3 text-xs uppercase tracking-[0.25em] hover:bg-foreground hover:text-background">Back home</Link>
        <Link to="/products" search={{ q: undefined }} className="bg-foreground px-6 py-3 text-xs uppercase tracking-[0.25em] text-background hover:bg-foreground/85">Continue shopping</Link>
      </div>
    </div>
  );
}