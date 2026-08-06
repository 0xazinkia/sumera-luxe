import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, MessageCircle, Menu, X, Search, PackageSearch } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { whatsappHref } from "@/lib/config";
import { siteSettingsQuery } from "@/lib/queries";
import { useCart } from "@/lib/cart";

export function SiteHeader() {
  const { count } = useCart();
  const settingsQuery = useQuery(siteSettingsQuery());
  const settings = settingsQuery.data ?? null;
  const isSettingsLoading = settingsQuery.isPending || settingsQuery.isFetching;
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const term = q.trim();
    if (!term) return;
    navigate({ to: "/products", search: { q: term } as any });
    setSearchOpen(false);
    setOpen(false);
  };

  const brand = settings?.brand_name ?? "Suméra Luxe";
  const tagline = settings?.brand_tagline ?? "Beauty · Skincare · Gifts";
  const waNumber = settings?.whatsapp_number ?? "8801322126233";
  const waDisplay = settings?.whatsapp_display ?? "+880 1322-126233";

  if (isSettingsLoading) {
    return (
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:h-20 md:px-8">
          <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
          <div className="hidden items-center gap-8 md:flex">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-4 w-16 animate-pulse rounded bg-muted" />
            ))}
          </div>
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:h-20 md:px-8">
        <button
          className="md:hidden text-foreground"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>

        <Link to="/" className="flex items-center gap-2">
          <img src="/sumera_luxe_logo.png" alt={brand} className="h-10 w-10 rounded-full object-cover md:h-12 md:w-12" />
          <div>
            <div className="font-serif text-base leading-none tracking-wide md:text-2xl">{brand}</div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-gold md:text-[11px]">{tagline}</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm">
          <Link to="/" className="hover:text-gold transition-colors">Home</Link>
          <Link to="/products" search={{ q: undefined }} className="hover:text-gold transition-colors">Shop</Link>
          <Link to="/categories" className="hover:text-gold transition-colors">Categories</Link>
          <Link to="/track" className="hover:text-gold transition-colors">Track Order</Link>
        </nav>

        <div className="flex items-center gap-3 md:gap-5">
          <a
            href={whatsappHref(`Hello ${brand}, I'd like to know more.`, waNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-1.5 text-sm text-foreground/80 hover:text-gold"
          >
            <MessageCircle className="size-4" />
            <span className="hidden lg:inline">{waDisplay}</span>
          </a>
          <button
            type="button"
            onClick={() => setSearchOpen((s) => !s)}
            className="hidden md:inline-flex text-foreground/80 hover:text-gold"
            aria-label="Search"
            aria-expanded={searchOpen}
          >
            <Search className="size-5" />
          </button>
          <Link to="/cart" className="relative grid size-9 place-items-center rounded-full bg-muted text-foreground hover:bg-gold/10 hover:text-gold" aria-label="Cart">
            <ShoppingBag className="size-5" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-border/60 bg-background">
          <form
            onSubmit={submitSearch}
            className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 md:px-8"
          >
            <Search className="size-4 text-muted-foreground" />
            <label htmlFor="site-search" className="sr-only">Search products</label>
            <input
              id="site-search"
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search perfumes, skincare, gifts…"
              className="flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              className="border border-foreground px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] hover:bg-foreground hover:text-background"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              aria-label="Close search"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </form>
        </div>
      )}

      {open && (
        <div className="md:hidden border-t border-border/60 bg-background">
          <div className="mx-auto max-w-7xl px-4 py-4 flex flex-col gap-3 text-sm">
            <form onSubmit={submitSearch} className="flex items-center gap-2 border border-border px-2 py-1.5">
              <Search className="size-4 text-muted-foreground" />
              <label htmlFor="site-search-mobile" className="sr-only">Search products</label>
              <input
                id="site-search-mobile"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search products…"
                className="flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
              />
            </form>
            <Link to="/" onClick={() => setOpen(false)} className="py-1">Home</Link>
            <Link to="/products" search={{ q: undefined }} onClick={() => setOpen(false)} className="py-1">Shop All</Link>
            <Link to="/categories" onClick={() => setOpen(false)} className="py-1">Categories</Link>
            <Link to="/track" onClick={() => setOpen(false)} className="py-1 inline-flex items-center gap-2">
              <PackageSearch className="size-4" /> Track Order
            </Link>
            <a
              href={whatsappHref(`Hello ${brand}, I'd like to know more.`, waNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-2 text-gold"
            >
              <MessageCircle className="size-4" /> {waDisplay}
            </a>
          </div>
        </div>
      )}
    </header>
  );
}