import { createFileRoute } from "@tanstack/react-router";
import { useSiteSettings } from "@/lib/hooks";

const URL = "https://sumeraluxe.com/terms";
const TITLE = "Terms & Conditions — Suméra Luxe Bangladesh";
const DESC =
  "The terms that govern orders, pricing, delivery and use of Suméra Luxe by customers in Bangladesh. Please read before placing your order.";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "en_BD" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: TermsPage,
});

function TermsPage() {
  const s = useSiteSettings();
  const brand = s?.brand_name ?? "Suméra Luxe";
  const email = s?.contact_email ?? "hello@sumeraluxe.com";
  const wa = s?.whatsapp_display ?? "+880 1322-126233";
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 md:px-8 md:py-20">
      <header className="text-center">
        <div className="text-[11px] uppercase tracking-[0.35em] text-gold">Legal</div>
        <h1 className="mt-2 font-serif text-4xl md:text-5xl">Terms &amp; Conditions</h1>
        <div className="gold-rule mt-4" />
        <p className="mt-4 text-xs text-muted-foreground">Last updated: 26 July 2026</p>
      </header>

      <div className="mt-10 space-y-8 text-[15px] leading-[1.85] text-foreground/85">
        <p>
          Welcome to {brand}. By browsing our website or placing an order
          with us, you agree to the following terms. These terms are
          governed by the laws of the People's Republic of Bangladesh.
        </p>

        <Section title="1. About us">
          {brand} is a luxury beauty house based in Dhaka, Bangladesh,
          offering perfumes, skincare, makeup and gifting exclusively to
          customers within Bangladesh.
        </Section>

        <Section title="2. Orders and acceptance">
          Placing an order through our website or WhatsApp is an offer to
          buy. An order is only confirmed once our team verifies it by
          phone or WhatsApp. We reserve the right to refuse or cancel any
          order — for example if the product is out of stock, the delivery
          address cannot be verified, or the order appears fraudulent.
        </Section>

        <Section title="3. Pricing and payment">
          All prices are shown in Bangladeshi Taka (BDT) and are inclusive
          of applicable VAT. We currently accept Cash on Delivery only.
          Delivery charges (Inside Dhaka / Outside Dhaka) are shown at
          checkout and added to your order total.
        </Section>

        <Section title="4. Product information">
          We take care to describe products accurately, but colour, scent
          and packaging can vary slightly from what is shown on screen.
          Fragrance is personal — how a perfume performs may vary by skin
          chemistry and climate.
        </Section>

        <Section title="5. Delivery">
          We deliver anywhere in Bangladesh. Estimated delivery is 1–2
          working days inside Dhaka and 3–5 working days outside Dhaka.
          Full details are in our <a href="/shipping-returns" className="text-gold underline">Shipping &amp; Returns</a> policy.
        </Section>

        <Section title="6. Returns and refunds">
          Because beauty products are personal-care items, returns are
          limited to damaged, defective or incorrect items. Please see our
          <a href="/shipping-returns" className="text-gold underline"> Shipping &amp; Returns </a>
          policy for the full process and eligibility.
        </Section>

        <Section title="7. Intellectual property">
          All content on this website — including brand name, logo,
          photography, product descriptions and design — is the property of
          {" "}{brand} and may not be copied, reproduced or used for
          commercial purposes without written permission.
        </Section>

        <Section title="8. User conduct">
          You agree not to misuse the website, attempt to gain unauthorised
          access, or place fraudulent orders. We may block or refuse
          service to any customer who abuses our team, couriers or
          policies.
        </Section>

        <Section title="9. Limitation of liability">
          {brand} is not liable for any indirect, incidental or
          consequential loss arising from use of the website or products.
          Our maximum liability for any order is limited to the amount
          paid for that order.
        </Section>

        <Section title="10. Governing law">
          These terms are governed by the laws of Bangladesh. Any dispute
          shall be subject to the exclusive jurisdiction of the courts of
          Dhaka.
        </Section>

        <Section title="11. Contact">
          Questions? Email {email} or WhatsApp {wa}.
        </Section>
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-serif text-xl">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}