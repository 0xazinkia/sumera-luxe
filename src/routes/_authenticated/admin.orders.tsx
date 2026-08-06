import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: OrdersPage,
});

const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;
const money = (n: number) => `Tk. ${Number(n ?? 0).toLocaleString()}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const areaLabel = (a: string) =>
  a?.startsWith("inside") ? "Inside Dhaka" : a?.startsWith("outside") ? "Outside Dhaka" : (a ?? "—");

function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [open, setOpen] = useState<any | null>(null);
  const [items, setItems] = useState<any[] | null>(null);

  const load = async () => {
    const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setOrders(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status } as any).eq("id", id);
    if (error) return toast.error(error.message);
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    setOpen((o: any) => (o && o.id === id ? { ...o, status } : o));
  };

  const view = async (order: any) => {
    setOpen(order);
    setItems(null);
    const { data, error } = await supabase.from("order_items").select("*").eq("order_id", order.id);
    if (error) toast.error(error.message);
    setItems(data ?? []);
  };

  const remove = async (id: string, orderNumber: string) => {
    if (!confirm(`Delete order ${orderNumber}?`)) return;
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setOrders((prev) => prev.filter((o) => o.id !== id));
    if (open?.id === id) setOpen(null);
    toast.success("Order deleted");
  };

  const removeMonth = async () => {
    if (monthFilter === "all") {
      toast.error("Select a month first");
      return;
    }

    const monthLabel = new Date(`${monthFilter}-01`).toLocaleDateString(undefined, { month: "long", year: "numeric" });
    if (!confirm(`Delete all orders from ${monthLabel}?`)) return;

    const [year, month] = monthFilter.split("-").map(Number);
    const start = new Date(Date.UTC(year, month - 1, 1)).toISOString();
    const end = new Date(Date.UTC(year, month, 1)).toISOString();

    const { error } = await supabase.from("orders").delete().gte("created_at", start).lt("created_at", end);

    if (error) return toast.error(error.message);

    setOrders((prev) => prev.filter((o) => new Date(o.created_at).toISOString().slice(0, 7) !== monthFilter));
    if (open && new Date(open.created_at).toISOString().slice(0, 7) === monthFilter) setOpen(null);
    toast.success(`Deleted orders from ${monthLabel}`);
  };

  const monthOptions = Array.from(new Set(orders.map((o) => new Date(o.created_at).toISOString().slice(0, 7)))).sort().reverse();

  const filteredByMonth = monthFilter === "all" ? orders : orders.filter((o) => new Date(o.created_at).toISOString().slice(0, 7) === monthFilter);
  const shown = (filter === "all" ? filteredByMonth : filteredByMonth.filter((o) => o.status === filter));
  const counts = (s: string) => (s === "all" ? filteredByMonth.length : filteredByMonth.filter((o) => o.status === s).length);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-4xl">Orders</h1>
        <nav className="flex flex-wrap items-center gap-1 rounded-full border border-border bg-card p-1">
          {(["all", ...STATUSES] as string[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                filter === s ? "bg-gold/15 text-gold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "all" ? "All" : cap(s)} <span className="opacity-60">{counts(s)}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-muted-foreground">Month</label>
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="all">All months</option>
            {monthOptions.map((m) => (
              <option key={m} value={m}>{new Date(`${m}-01`).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</option>
            ))}
          </select>
        </div>
        <button
          onClick={removeMonth}
          className="inline-flex items-center gap-2 rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive"
        >
          <Trash2 className="size-4" /> Delete selected month
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <th className="px-5 py-4 font-normal">Order</th>
              <th className="px-5 py-4 font-normal">Customer</th>
              <th className="px-5 py-4 font-normal">Phone</th>
              <th className="px-5 py-4 font-normal">Total</th>
              <th className="px-5 py-4 font-normal">Status</th>
              <th className="px-5 py-4 font-normal">Date</th>
              <th className="px-5 py-4 font-normal text-right">Details</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((o) => (
              <tr key={o.id} className="border-b border-border/60 last:border-0">
                <td className="px-5 py-4 font-mono text-xs">{o.order_number}</td>
                <td className="px-5 py-4">{o.customer_name}</td>
                <td className="px-5 py-4">{o.phone}</td>
                <td className="px-5 py-4 font-medium">{money(o.total)}</td>
                <td className="px-5 py-4">
                  <select
                    value={o.status}
                    onChange={(e) => setStatus(o.id, e.target.value)}
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{cap(s)}</option>
                    ))}
                  </select>
                </td>
                <td className="px-5 py-4 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                <td className="px-5 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => view(o)} className="text-sm text-gold hover:underline">
                      View
                    </button>
                    <button onClick={() => remove(o.id, o.order_number)} className="inline-flex items-center gap-1 text-sm text-destructive hover:underline">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No orders here.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4 sm:p-8">
          <div className="w-full max-w-2xl rounded-lg border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <h2 className="font-serif text-2xl">Order details</h2>
              <button onClick={() => setOpen(null)} aria-label="Close" className="text-muted-foreground hover:text-foreground">
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-6 px-6 py-6">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <Field label="Order #" value={open.order_number} mono />
                <Field label="Status" value={cap(open.status)} />
                <Field label="Customer" value={open.customer_name} />
                <Field label="Phone" value={open.phone} />
                <Field label="Area" value={areaLabel(open.area ?? open.delivery_area)} />
                <Field label="Date" value={new Date(open.created_at).toLocaleString()} />
              </div>

              <div>
                <Label>Address</Label>
                <p className="mt-2 rounded-md bg-muted/50 px-4 py-3 text-sm">
                  {open.address}{open.city ? `, ${open.city}` : ""}
                </p>
              </div>

              {open.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="mt-2 rounded-md bg-muted/50 px-4 py-3 text-sm">{open.notes}</p>
                </div>
              )}

              <div>
                <Label>Items</Label>
                <ul className="mt-2 space-y-2">
                  {items === null && <li className="text-sm text-muted-foreground">Loading…</li>}
                  {items?.map((it) => (
                    <li key={it.id} className="flex items-center gap-4 rounded-md border border-border p-3">
                      {it.image_url && (
                        <img src={it.image_url} alt={it.product_name} className="size-14 shrink-0 rounded object-cover" loading="lazy" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{it.product_name}</p>
                        {it.variant_label && <p className="text-xs text-muted-foreground">{it.variant_label}</p>}
                        <p className="text-xs text-muted-foreground">Qty {it.quantity} × {money(it.unit_price)}</p>
                      </div>
                      <span className="font-medium">{money(it.line_total)}</span>
                    </li>
                  ))}
                  {items?.length === 0 && <li className="text-sm text-muted-foreground">No items recorded.</li>}
                </ul>
              </div>

              <div className="space-y-1.5 rounded-md bg-muted/50 px-4 py-4 text-sm">
                <Row label="Subtotal" value={money(open.subtotal)} />
                {Number(open.discount_amount ?? 0) > 0 && (
                  <Row label={`Discount${open.discount_code ? ` (${open.discount_code})` : ""}`} value={`−${money(open.discount_amount)}`} />
                )}
                <Row label="Delivery" value={money(open.delivery_fee)} />
                <div className="flex items-center justify-between border-t border-border pt-2 text-base">
                  <span className="font-medium">Total</span>
                  <span className="font-serif text-xl text-gold">{money(open.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{children}</div>;
}

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <Label>{label}</Label>
      <p className={`mt-1 ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}