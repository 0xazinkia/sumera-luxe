import { createFileRoute, Link } from "@tanstack/react-router";
import { useSiteSettings } from "@/lib/hooks";

const URL = "https://sumeraluxe.com/about";
const TITLE = "About Suméra Luxe — Luxury Beauty House in Bangladesh";
const DESC =
  "Suméra Luxe is a Dhaka-based luxury beauty house curating perfumes, skincare and gifting for the modern Bangladeshi woman. Discover our story, values and craft.";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: "about Suméra Luxe, luxury beauty Bangladesh, Dhaka perfume brand, Bangladeshi skincare house" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "en_BD" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: TITLE,
          description: DESC,
          url: URL,
          inLanguage: "en-BD",
          about: { "@type": "Organization", name: "Suméra Luxe", areaServed: "BD" },
        }),
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const s = useSiteSettings();
  const brand = s?.brand_name ?? "Suméra Luxe";
  return (
    <article className="mx-auto max-w-4xl px-4 py-14 md:px-8 md:py-20">
      <header className="text-center">
        <div className="text-[11px] uppercase tracking-[0.35em] text-gold">Our Story</div>
        <h1 className="mt-2 font-serif text-4xl md:text-5xl">About {brand}</h1>
        <div className="gold-rule mt-4" />
        <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          A quiet-luxury beauty house created in Bangladesh, for the modern
          Bangladeshi woman who values craft, restraint and quality above trend.
        </p>
      </header>

      <section className="mt-12 space-y-6 text-[15px] leading-[1.85] text-foreground/85">
        <p>
          {brand} was founded in Dhaka with a simple belief — that luxury beauty
          should feel personal, considered and made to last. From our first
          fragrance to the newest gifting edit, every piece we release is chosen
          for its craftsmanship, longevity on skin and the quiet confidence it
          gives the woman wearing it.
        </p>
        <p>
          We work with trusted ateliers and skincare formulators to bring an
          international standard of luxury to Bangladesh, at prices that respect
          our customer. Every order is packed by hand in Dhaka and delivered
          across the country with cash on delivery, because we believe buying
          something beautiful should feel effortless.
        </p>
      </section>

      <section className="mt-12 grid gap-6 md:grid-cols-3">
        {[
          { t: "Considered Craft", d: "Small-batch fragrances, refined skincare and gifting curated by our atelier — never mass-market." },
          { t: "Made for Bangladesh", d: "Prices in BDT, cash on delivery nationwide, and customer care over WhatsApp in Bangla and English." },
          { t: "Quiet Luxury", d: "Timeless over trend. Every piece is chosen to last on your vanity, not disappear next season." },
        ].map((v) => (
          <div key={v.t} className="rounded-lg border border-border/60 bg-cream/40 p-6">
            <h3 className="font-serif text-lg">{v.t}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.d}</p>
          </div>
        ))}
      </section>

      <section className="mt-14 rounded-lg border border-border/60 bg-cream/50 p-8 text-center">
        <h2 className="font-serif text-2xl">Discover the collection</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Perfumes, skincare, makeup and gift sets — hand-picked for the
          Bangladeshi woman, delivered with care from Dhaka.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link to="/products" search={{ q: undefined }} className="rounded-full bg-ink px-6 py-2.5 text-sm text-cream hover:opacity-90">Shop all</Link>
          <Link to="/categories" className="rounded-full border border-border/60 px-6 py-2.5 text-sm hover:bg-cream/60">Browse categories</Link>
        </div>
      </section>
    </article>
  );
}