import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/components/product-card";
import { categoriesQuery, productsQuery } from "@/lib/queries";
import { productPrice } from "@/lib/db-types";

export const Route = createFileRoute("/products/")({
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shop All Luxury Beauty in Bangladesh — Suméra Luxe" },
      { name: "description", content: "Shop the full Suméra Luxe collection in Bangladesh — perfume, skincare, makeup, gift sets and bath & body with cash on delivery in Dhaka and nationwide." },
      { property: "og:title", content: "Shop All Luxury Beauty in Bangladesh — Suméra Luxe" },
      { property: "og:description", content: "Luxury perfume, skincare and gifts — cash on delivery across Bangladesh." },
      { property: "og:locale", content: "en_BD" },
      { property: "og:url", content: "https://sumeraluxe.com/products" },
    ],
    links: [{ rel: "canonical", href: "https://sumeraluxe.com/products" }],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { q: searchQ } = Route.useSearch();
  const categories = useQuery(categoriesQuery()).data ?? [];
  const products = useQuery(productsQuery()).data ?? [];
  const [filter, setFilter] = useState<string>("all");
  const [sort, setSort] = useState<string>("featured");

  let items = filter === "all" ? products : products.filter((p) => p.category?.slug === filter);
  if (searchQ) {
    const needle = searchQ.toLowerCase();
    items = items.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        (p.description ?? "").toLowerCase().includes(needle) ||
        (p.category?.name ?? "").toLowerCase().includes(needle),
    );
  }
  items = [...items].sort((a, b) => {
    if (sort === "price-asc") return productPrice(a) - productPrice(b);
    if (sort === "price-desc") return productPrice(b) - productPrice(a);
    if (sort === "newest") return +new Date(b.updated_at) - +new Date(a.updated_at);
    return Number(!!b.is_featured) - Number(!!a.is_featured);
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
      <div className="text-center">
        <div className="text-[11px] uppercase tracking-[0.35em] text-gold">Shop All</div>
        <h1 className="mt-2 font-serif text-4xl md:text-5xl">
          {searchQ ? `Search: “${searchQ}”` : "The Collection"}
        </h1>
        <div className="gold-rule mt-4" />
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-xs uppercase tracking-[0.2em] border ${filter === "all" ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"}`}
          >All</button>
          {categories.map((c) => (
            <button
              key={c.slug}
              onClick={() => setFilter(c.slug)}
              className={`px-3 py-1.5 text-xs uppercase tracking-[0.2em] border ${filter === c.slug ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"}`}
            >{c.name}</button>
          ))}
        </div>
        <label htmlFor="products-sort" className="sr-only">Sort products</label>
        <select
          id="products-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="border border-border bg-background px-3 py-2 text-xs uppercase tracking-[0.15em]"
        >
          <option value="featured">Sort: Featured</option>
          <option value="newest">Newest</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
        </select>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-8">
        {items.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>

      {items.length === 0 && (
        <div className="mt-16 text-center text-muted-foreground">
          No products yet in this category. <Link to="/products" search={{ q: undefined }} className="underline">View all</Link>
        </div>
      )}
    </div>
  );
}