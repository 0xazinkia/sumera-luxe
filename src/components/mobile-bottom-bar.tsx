import { Link, useRouterState } from "@tanstack/react-router";
import { Home, LayoutGrid, ShoppingBag, PackageSearch } from "lucide-react";
import { useCart } from "@/lib/cart";

const tabs = [
  { to: "/" as const, label: "Home", icon: Home, match: (p: string) => p === "/" },
  { to: "/categories" as const, label: "Categories", icon: LayoutGrid, match: (p: string) => p.startsWith("/categories") || p.startsWith("/category") },
  { to: "/cart" as const, label: "Cart", icon: ShoppingBag, match: (p: string) => p.startsWith("/cart") },
  { to: "/track" as const, label: "Track", icon: PackageSearch, match: (p: string) => p.startsWith("/track") },
];

export function MobileBottomBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { count } = useCart();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {tabs.map(({ to, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={to}>
              <Link
                to={to}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] uppercase tracking-[0.2em] ${active ? "text-gold" : "text-foreground/70"}`}
              >
                <span className="relative">
                  <Icon className="size-5" />
                  {to === "/cart" && count > 0 && (
                    <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-foreground px-1 text-[9px] font-semibold text-background">
                      {count}
                    </span>
                  )}
                </span>
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}