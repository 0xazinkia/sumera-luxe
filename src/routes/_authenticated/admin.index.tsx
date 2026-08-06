import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, TrendingUp, DollarSign, Package } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

type Stats = {
  todayCount: number;
  todayRevenue: number;
  monthCount: number;
  monthRevenue: number;
  monthlyCancelled: number;
  totalProducts: number;
  recent: any[];
};

async function loadStats(): Promise<Stats> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [ordersRes, recentRes, productsRes] = await Promise.all([
    supabase.from("orders").select("total,status,created_at"),
    supabase.from("orders").select("id,order_number,customer_name,total,status").order("created_at", { ascending: false }).limit(6),
    supabase.from("products").select("id", { count: "exact", head: true }),
  ]);

  const orders = (ordersRes.data ?? []) as any[];
  const billable = (o: any) => o.status !== "cancelled";
  const activeOrders = orders.filter(billable);
  const today = activeOrders.filter((o) => o.created_at >= startOfDay);
  const month = activeOrders.filter((o) => o.created_at >= startOfMonth);
  const monthlyCancelled = orders.filter((o) => o.status === "cancelled" && o.created_at >= startOfMonth).length;
  const sum = (list: any[]) => list.reduce((t, o) => t + Number(o.total ?? 0), 0);

  return {
    todayCount: today.length,
    todayRevenue: sum(today),
    monthCount: month.length,
    monthRevenue: sum(month),
    monthlyCancelled,
    totalProducts: productsRes.count ?? 0,
    recent: (recentRes.data ?? []) as any[],
  };
}

const money = (n: number) => `Tk. ${Number(n).toLocaleString()}`;

function Dashboard() {
  const { data } = useQuery({ queryKey: ["admin-dashboard"], queryFn: loadStats, staleTime: 30_000 });
  const s = data;

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-4xl">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Overview of orders and performance</p>
        </div>
      </header>

      <div className="grid grid-cols-4 gap-2 sm:gap-4">
        <Stat label="Today" value={s?.todayCount ?? 0} sub={money(s?.todayRevenue ?? 0)} icon={<ShoppingCart className="size-3 sm:size-4" />} />
        <Stat label="Month" value={s?.monthCount ?? 0} sub={money(s?.monthRevenue ?? 0)} icon={<TrendingUp className="size-3 sm:size-4" />} />
        <Stat label="Month cancelled" value={s?.monthlyCancelled ?? 0} icon={<DollarSign className="size-3 sm:size-4" />} />
        <Stat label="Total products" value={s?.totalProducts ?? 0} icon={<Package className="size-3 sm:size-4" />} />
      </div>

      <section className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <h2 className="font-serif text-xl">Recent Orders</h2>
          <Link to="/admin/orders" className="text-sm text-gold hover:underline">
            View all →
          </Link>
        </div>
        <ul className="divide-y divide-border">
          {(s?.recent ?? []).map((o) => (
            <li key={o.id} className="flex items-center gap-4 px-6 py-4 text-sm">
              <span className="font-mono text-xs">{o.order_number}</span>
              <span className="truncate">{o.customer_name}</span>
              <span className="ml-auto flex items-center gap-4">
                <StatusPill status={o.status} />
                <span className="font-medium">{money(o.total)}</span>
              </span>
            </li>
          ))}
          {(!s || s.recent.length === 0) && (
            <li className="px-6 py-10 text-center text-sm text-muted-foreground">No orders yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value, sub, icon }: { label: string; value: number; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground sm:text-[11px] sm:tracking-[0.2em]">{label}</div>
        <span className="flex size-7 items-center justify-center rounded-full bg-muted text-gold sm:size-9">{icon}</span>
      </div>
      <div className="mt-2 font-serif text-2xl sm:mt-4 sm:text-4xl">{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-muted-foreground sm:mt-1 sm:text-xs">{sub}</div>}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "cancelled"
      ? "bg-destructive/10 text-destructive"
      : status === "delivered"
        ? "bg-gold/15 text-gold"
        : "bg-muted text-muted-foreground";
  return <span className={`rounded-full px-2.5 py-1 text-[11px] ${tone}`}>{status}</span>;
}