import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { productsQuery, categoriesQuery } from "@/lib/queries";
import { LogOut, Package, Tag, ShoppingCart, LayoutDashboard, Image as ImageIcon, Megaphone, Settings, Ticket, Users, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const [role, setRole] = useState<"admin" | "staff" | null | undefined>(undefined);
  const [email, setEmail] = useState<string>("");
  const [navOpen, setNavOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => { setNavOpen(false); }, [pathname]);

  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return setRole(null);
      setEmail(userRes.user.email ?? "");
      const { data } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", userRes.user.id);
      const roles = ((data as any) ?? []).map((r: any) => r.role);
      if (roles.includes("admin")) return setRole("admin");
      if (roles.includes("staff")) return setRole("staff");
      // try to claim admin if no admin exists yet
      const { data: claim } = await supabase.rpc("claim_admin" as any);
      setRole(claim ? "admin" : null);
    })();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  if (role === undefined) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (!role)
    return (
      <div className="mx-auto max-w-lg p-10 text-center">
        <h1 className="font-serif text-2xl">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your account doesn't have admin or staff access.</p>
        <button onClick={signOut} className="mt-6 border border-foreground px-6 py-3 text-xs uppercase tracking-[0.25em]">Sign out</button>
      </div>
    );

  const NavContents = (
    <>
      <Link to="/" className="flex items-center gap-3 border-b border-border px-5 py-4">
        <img src="/sumera_luxe_logo.png" alt="Suméra Luxe" className="size-9 rounded-full object-cover" />
        <span className="font-serif text-lg">
          Suméra <span className="text-gold">Luxe</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {role === "admin" && <AdminLink to="/admin" icon={<LayoutDashboard className="size-[18px]" />}>Dashboard</AdminLink>}
        <AdminLink to="/admin/orders" icon={<ShoppingCart className="size-[18px]" />}>Orders</AdminLink>
        {role === "admin" && (
          <>
            <AdminLink to="/admin/products" icon={<Package className="size-[18px]" />}>Products</AdminLink>
            <AdminLink to="/admin/categories" icon={<Tag className="size-[18px]" />}>Categories</AdminLink>
            <AdminLink to="/admin/discounts" icon={<Ticket className="size-[18px]" />}>Discount Codes</AdminLink>
            <AdminLink to="/admin/hero-slides" icon={<ImageIcon className="size-[18px]" />}>Hero Slides</AdminLink>
            <AdminLink to="/admin/banners" icon={<Megaphone className="size-[18px]" />}>Banners</AdminLink>
            <AdminLink to="/admin/team" icon={<Users className="size-[18px]" />}>Team & Roles</AdminLink>
            <AdminLink to="/admin/settings" icon={<Settings className="size-[18px]" />}>Settings</AdminLink>
          </>
        )}
      </nav>
      <div className="space-y-3 border-t border-border p-4">
        <div className="truncate text-xs text-muted-foreground">{email}</div>
        <div className="flex gap-2">
          <Link
            to="/"
            className="flex-1 border border-border px-3 py-2 text-center text-xs uppercase tracking-[0.15em] hover:bg-muted"
          >
            View shop
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 bg-destructive px-3 py-2 text-xs uppercase tracking-[0.15em] text-destructive-foreground hover:opacity-90"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[260px_1fr]">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetTrigger asChild>
            <button aria-label="Open menu" className="grid size-9 place-items-center rounded-md border border-border">
              <Menu className="size-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-72 flex-col p-0">
            <SheetTitle className="sr-only">Admin navigation</SheetTitle>
            {NavContents}
          </SheetContent>
        </Sheet>
        <div className="flex min-w-0 items-center gap-2">
          <img src="/sumera_luxe_logo.png" alt="" className="size-7 shrink-0 rounded-full object-cover" />
          <span className="truncate font-serif text-base">
            Suméra <span className="text-gold">Luxe</span>
          </span>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden flex-col border-border bg-card md:sticky md:top-0 md:flex md:h-screen md:border-r">
        {NavContents}
      </aside>

      <main className="min-w-0 p-4 sm:p-5 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}

function AdminLink({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = to === "/admin" ? pathname === "/admin" : pathname.startsWith(to);
  return (
    <Link
      to={to as any}
      className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
        active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      }`}
    >
      {icon} {children}
    </Link>
  );
}

export function AdminDashboardStats() {
  const products = useQuery(productsQuery()).data ?? [];
  const cats = useQuery(categoriesQuery()).data ?? [];
  return { products: products.length, categories: cats.length };
}