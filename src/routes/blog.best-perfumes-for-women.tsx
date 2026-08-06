import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/components/product-card";
import { productsQuery } from "@/lib/queries";

const URL = "https://sumeraluxe.com/blog/best-perfumes-for-women";
const TITLE = "10 Best Luxury Perfumes for Women in Bangladesh — Suméra Luxe";
const DESC =
  "An editor's guide to the 10 best luxury perfumes for women in Bangladesh — curated fragrance picks for day, evening, work and gifting, with cash on delivery from Suméra Luxe.";

export const Route = createFileRoute("/blog/best-perfumes-for-women")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "The 10 Best Luxury Perfumes for Women",
          description: DESC,
          author: { "@type": "Organization", name: "Suméra Luxe" },
          publisher: { "@type": "Organization", name: "Suméra Luxe" },
          mainEntityOfPage: URL,
        }),
      },
    ],
  }),
  component: BestPerfumes,
});

function BestPerfumes() {
  const products = useQuery(productsQuery()).data ?? [];
  const perfumes = products
    .filter((p) => p.category?.slug === "perfumes")
    .slice(0, 10);

  return (
    <article className="mx-auto max-w-4xl px-4 py-14 md:px-8 md:py-20">
      <header className="text-center">
        <div className="text-[11px] uppercase tracking-[0.35em] text-gold">The Edit</div>
        <h1 className="mt-2 font-serif text-4xl md:text-5xl">
          The 10 Best Luxury Perfumes for Women
        </h1>
        <div className="gold-rule mt-4" />
        <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          A quiet-luxury guide to the fragrances worth wearing this season — from
          soft floral daywear to warm, radiant evening scents. Every piece here is
          hand-picked by the Suméra Luxe atelier for its craftsmanship, longevity
          and elegance on skin.
        </p>
      </header>

      <section className="prose prose-neutral mt-12 max-w-none font-serif text-lg leading-relaxed">
        <h2 className="font-serif text-2xl">How to choose a luxury perfume</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground font-sans">
          A great fragrance is less about trend and more about the version of
          yourself you want to show up as. Consider three things: <em>occasion</em>{" "}
          (day, work, evening, gifting), <em>family</em> (floral, oriental, woody,
          gourmand), and <em>longevity</em> — luxury perfumes are usually eau de
          parfum or extrait, which sit closer to the skin and last longer than
          eau de toilette.
        </p>

        <h2 className="mt-10 font-serif text-2xl">Editor's picks</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground font-sans">
          Below are our current favourites from the Suméra Luxe collection —
          each chosen for the kind of woman who prefers considered, wearable
          luxury over anything loud.
        </p>
      </section>

      {perfumes.length > 0 ? (
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-8">
          {perfumes.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Our perfume collection is being restocked.{" "}
          <Link to="/products" search={{ q: undefined }} className="underline">Browse the wider shop</Link>.
        </p>
      )}

      <section className="mt-16 border-t border-border pt-10 text-sm leading-relaxed text-muted-foreground">
        <h2 className="font-serif text-2xl text-foreground">
          Styling notes for different occasions
        </h2>
        <ul className="mt-4 space-y-3">
          <li>
            <strong className="text-foreground">Daytime & work:</strong> Choose
            soft florals, citrus or clean musks. They read polished without
            filling the room.
          </li>
          <li>
            <strong className="text-foreground">Evening & occasion:</strong> Warm
            orientals, ambers and gourmands carry beautifully after dark and
            layer well over silk and cashmere.
          </li>
          <li>
            <strong className="text-foreground">Gifting:</strong> When in doubt,
            a universal floral-woody in an eau de parfum concentration is the
            safest luxury gift.
          </li>
        </ul>

        <div className="mt-10 text-center">
          <Link
            to="/category/$slug"
            params={{ slug: "perfumes" }}
            className="inline-block bg-foreground px-6 py-3 text-xs uppercase tracking-[0.25em] text-background hover:bg-foreground/85"
          >
            Shop the full perfume collection
          </Link>
        </div>
      </section>
    </article>
  );
}