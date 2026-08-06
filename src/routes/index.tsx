import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { HeroSlider } from "@/components/hero-slider";
import { ProductCard } from "@/components/product-card";
import { categoriesQuery, productsQuery } from "@/lib/queries";
import { useBannerBySlot } from "@/lib/hooks";
import type { Category, Product } from "@/lib/db-types";

const BENGALI_RE = /[\u0980-\u09FF]/;
const containsBengali = (value?: string | null) => typeof value === "string" && BENGALI_RE.test(value);


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Suméra Luxe Bangladesh — Luxury Perfume, Skincare & Gifts" },
      { name: "description", content: "Shop luxury perfume, skincare, makeup and gift sets at Suméra Luxe — Bangladesh's quiet-luxury beauty house. Cash on delivery in Dhaka and across Bangladesh." },
      { property: "og:title", content: "Suméra Luxe Bangladesh — Luxury Perfume, Skincare & Gifts" },
      { property: "og:description", content: "Shop luxury perfume, skincare, makeup and gift sets at Suméra Luxe — Bangladesh's quiet-luxury beauty house. Cash on delivery in Dhaka and across Bangladesh." },
      { property: "og:locale", content: "en_BD" },
      { property: "og:url", content: "https://sumeraluxe.com/" },
    ],
    links: [{ rel: "canonical", href: "https://sumeraluxe.com/" }],
  }),
  component: Index,
});

function SectionHeading({
  eyebrow,
  title,
  viewAll,
}: {
  eyebrow?: string;
  title: string;
  viewAll?: { to: string; params?: Record<string, string> };
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="text-[11px] uppercase tracking-[0.35em] text-gold">{eyebrow}</div>}
        <h2 className="mt-1 font-serif text-3xl md:text-4xl">{title}</h2>
      </div>
      {viewAll && (
        <Link
          to={viewAll.to as any}
          params={viewAll.params as any}
          className="whitespace-nowrap border-b border-foreground pb-0.5 text-xs uppercase tracking-[0.25em] hover:text-gold hover:border-gold"
        >
          View All
        </Link>
      )}
    </div>
  );
}

function CategoryBlock({ category, products }: { category: Category; products: Product[] }) {
  const items = products.filter((p) => p.category?.slug === category.slug).slice(0, 8);
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-3">
      <SectionHeading eyebrow="The Collection" title={category.name} viewAll={{ to: "/category/$slug", params: { slug: category.slug } }} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-8">
        {items.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}

function Index() {
  const categoriesQueryResult = useQuery(categoriesQuery());
  const productsQueryResult = useQuery(productsQuery());
  const categories = categoriesQueryResult.data ?? [];
  const products = productsQueryResult.data ?? [];
  const isLoading = categoriesQueryResult.isPending || productsQueryResult.isPending;
  const promo = useBannerBySlot("promo");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const cats = categories.slice(0, 5);
  const [first, second, ...rest] = cats;
  const hasPromoContent = Boolean(promo?.eyebrow || promo?.title || promo?.subtitle || promo?.cta_label);
  const promoImage = isMobile && promo?.mobile_image_url ? promo.mobile_image_url : promo?.image_url;

  if (isLoading) {
    return (
      <>
        <HeroSlider />
        <section className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
          <div className="text-center">
            <div className="mx-auto h-3 w-24 animate-pulse rounded-full bg-muted/70" />
            <div className="mx-auto mt-4 h-8 w-2/3 animate-pulse rounded bg-muted/70" />
          </div>
          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-5 md:gap-6">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="space-y-3">
                <div className="aspect-square animate-pulse rounded-sm bg-muted/70" />
                <div className="mx-auto h-4 w-2/3 animate-pulse rounded bg-muted/50" />
              </div>
            ))}
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <HeroSlider />

      <section className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
        <div className="text-center">
          <div className="text-[11px] uppercase tracking-[0.35em] text-gold">Shop by Category</div>
          <h2 className="mt-2 font-serif text-3xl md:text-4xl">A curated house of beauty</h2>
          <div className="gold-rule mt-4" />
        </div>
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-5 md:gap-6">
          {cats.map((c, idx) => {
            const count = products.filter((p) => p.category?.slug === c.slug).length;
            return (
              <Link key={c.slug} to="/category/$slug" params={{ slug: c.slug }} className={`group block ${idx === 4 ? "hidden md:block" : ""}`}>
                <div className="overflow-hidden rounded-xl bg-muted">
                  <img src={c.image_url ?? ""} alt={`${c.name} collection`} loading="lazy" className="aspect-square w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                </div>
                <div className="mt-3 text-center">
                  <h3 className="font-serif text-lg">{c.name}</h3>
                  <div className="text-xs text-muted-foreground">{count} items</div>
                </div>
              </Link>
            );
          })}
        </div>
        <div className="mt-10 text-center">
          <Link to={"/products" as any} className="inline-block border-b border-foreground pb-0.5 text-xs uppercase tracking-[0.25em] hover:text-gold hover:border-gold">
            View All Categories
          </Link>
        </div>
      </section>

      {first && <CategoryBlock category={first} products={products} />}
      {second && <CategoryBlock category={second} products={products} />}

      {promoImage && (
      <section className="mx-auto max-w-[1600px] px-4 py-8 md:px-8 md:py-10">
        <div className="relative overflow-hidden rounded-sm">
          <img src={promoImage} alt={promo?.title ?? "Luxury beauty edit"} loading="lazy" className="h-64 w-full object-cover md:h-80" />
          {hasPromoContent ? (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-black/45 to-black/10" />
              <div className="absolute inset-0 flex items-center px-8 md:px-16">
                <div className={`max-w-lg text-background ${containsBengali(promo?.eyebrow) || containsBengali(promo?.title) || containsBengali(promo?.cta_label) ? "bangla-font" : ""}`}>
                  {promo?.eyebrow ? (
                    <div className={`${containsBengali(promo?.eyebrow) ? "text-base tracking-normal" : "text-base uppercase tracking-[0.35em]"} pb-4 text-gold-soft`}>{promo.eyebrow}</div>
                  ) : null}
                  {promo?.title?.trim() ? (
                    <h3 className={`mt-2 font-serif text-3xl leading-tight md:text-4xl ${containsBengali(promo?.title) ? "bangla-font" : ""}`}>
                      {promo.title}
                    </h3>
                  ) : null}
                  {promo?.subtitle?.trim() ? (
                    <p className={`mt-3 max-w-md text-sm text-background/90 md:text-base ${containsBengali(promo?.subtitle) ? "bangla-font" : ""}`}>
                      {promo.subtitle}
                    </p>
                  ) : null}
                  {promo?.cta_label?.trim() ? (
                    <Link
                      to={typeof promo?.cta_href === "string" && promo.cta_href.trim() ? (promo.cta_href as any) : ("/products" as any)}
                      className={`mt-6 inline-flex items-center bg-background px-7 py-4 text-sm text-foreground hover:bg-gold hover:text-primary-foreground ${containsBengali(promo?.cta_label) ? "bangla-font" : "uppercase"}`}
                    >
                      {promo.cta_label}
                    </Link>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </section>
      )}

      {rest.map((c) => <CategoryBlock key={c.slug} category={c} products={products} />)}
    </>
  );
}