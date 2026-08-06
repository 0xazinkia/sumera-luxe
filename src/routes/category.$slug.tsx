import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/components/product-card";
import { categoryBySlugQuery, productsQuery } from "@/lib/queries";

export const Route = createFileRoute("/category/$slug")({
  loader: async ({ params, context }) => {
    const category = await context.queryClient.ensureQueryData(categoryBySlugQuery(params.slug));
    if (!category) throw notFound();
    return { category };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Category — Suméra Luxe" }, { name: "robots", content: "noindex" }] };
    const c = loaderData.category;
    const image = c.image_url ?? undefined;
    const url = `https://sumeraluxe.com/category/${c.slug}`;
    return {
      meta: [
        { title: `${c.name} in Bangladesh — Suméra Luxe` },
        { name: "description", content: `Shop ${c.name} at Suméra Luxe — curated luxury beauty in Bangladesh with cash on delivery in Dhaka and nationwide.` },
        { property: "og:title", content: `${c.name} in Bangladesh — Suméra Luxe` },
        { property: "og:description", content: `Shop ${c.name} at Suméra Luxe — cash on delivery across Bangladesh.` },
        { property: "og:locale", content: "en_BD" },
        { property: "og:url", content: url },
        ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `${c.name} — Suméra Luxe`,
            url,
            inLanguage: "en-BD",
            isPartOf: { "@type": "WebSite", name: "Suméra Luxe", url: "https://sumeraluxe.com" },
            about: { "@type": "Country", name: "Bangladesh" },
            ...(image ? { image } : {}),
          }),
        },
      ],
    };
  },
  component: CategoryPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="font-serif text-3xl">Category not found</h1>
      <Link to="/products" search={{ q: undefined }} className="mt-6 inline-block underline">Browse all products</Link>
    </div>
  ),
});

function CategoryPage() {
  const { category } = Route.useLoaderData();
  const all = useQuery(productsQuery()).data ?? [];
  const products = all.filter((p) => p.category?.slug === category.slug);
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16">
      <div className="relative mb-12 overflow-hidden rounded-sm">
        {category.image_url && (
          <img src={category.image_url} alt={`${category.name} collection banner`} className="h-48 w-full object-cover md:h-72" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-background/85 to-background/30" />
        <div className="absolute inset-0 flex items-center px-8 md:px-14">
          <div>
            <div className="text-[11px] uppercase tracking-[0.35em] text-gold">The Collection</div>
            <h1 className="mt-2 font-serif text-4xl md:text-5xl">{category.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{products.length} pieces</p>
          </div>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="py-24 text-center text-muted-foreground">
          Nothing here yet. <Link to="/products" search={{ q: undefined }} className="underline">View all products</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-8">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}