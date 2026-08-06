import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { categoriesQuery, productsQuery } from "@/lib/queries";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Luxury Beauty Categories in Bangladesh — Suméra Luxe" },
      { name: "description", content: "Explore Suméra Luxe collections in Bangladesh — perfume, skincare, makeup, gift sets and bath & body with cash on delivery nationwide." },
      { property: "og:title", content: "Luxury Beauty Categories in Bangladesh — Suméra Luxe" },
      { property: "og:description", content: "Every Suméra Luxe collection — delivered across Bangladesh." },
      { property: "og:locale", content: "en_BD" },
      { property: "og:url", content: "https://sumeraluxe.com/categories" },
    ],
    links: [{ rel: "canonical", href: "https://sumeraluxe.com/categories" }],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const categories = useQuery(categoriesQuery()).data ?? [];
  const products = useQuery(productsQuery()).data ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
      <div className="text-center">
        <div className="text-[11px] uppercase tracking-[0.35em] text-gold">Shop by Category</div>
        <h1 className="mt-2 font-serif text-4xl md:text-5xl">All Categories</h1>
        <div className="gold-rule mt-4" />
      </div>

      {categories.length === 0 ? (
        <p className="mt-16 text-center text-muted-foreground">No categories yet.</p>
      ) : (
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-8">
          {categories.map((c) => {
            const count = products.filter((p) => p.category?.slug === c.slug).length;
            return (
              <Link key={c.slug} to="/category/$slug" params={{ slug: c.slug }} className="group block">
                <div className="overflow-hidden rounded-xl bg-muted">
                  {c.image_url && (
                    <img src={c.image_url} alt={`${c.name} collection`} loading="lazy" className="aspect-square w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  )}
                </div>
                <div className="mt-3 text-center">
                  <h3 className="font-serif text-lg">{c.name}</h3>
                  <div className="text-xs text-muted-foreground">{count} items</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}