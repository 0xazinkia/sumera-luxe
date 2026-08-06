import { createFileRoute } from "@tanstack/react-router";
import { useSiteSettings } from "@/lib/hooks";

const URL = "https://sumeraluxe.com/shipping-returns";
const TITLE = "Shipping & Returns — Suméra Luxe Bangladesh";
const DESC =
  "Delivery charges, timelines and return policy for Suméra Luxe orders inside Dhaka and across Bangladesh — cash on delivery, hand-checked packing and easy support.";

export const Route = createFileRoute("/shipping-returns")({
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
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "How much is delivery in Bangladesh?",
              acceptedAnswer: { "@type": "Answer", text: "Tk. 60 inside Dhaka and Tk. 120 outside Dhaka. Delivery charge is added at checkout and paid on delivery." },
            },
            {
              "@type": "Question",
              name: "How long does delivery take?",
              acceptedAnswer: { "@type": "Answer", text: "1–2 working days inside Dhaka and 3–5 working days for the rest of Bangladesh after your order is confirmed." },
            },
            {
              "@type": "Question",
              name: "Can I return a Suméra Luxe order?",
              acceptedAnswer: { "@type": "Answer", text: "Yes — for damaged, defective or wrong items, contact us within 24 hours of delivery with photos of the parcel and product." },
            },
          ],
        }),
      },
    ],
  }),
  component: ShippingReturnsPage,
});

function ShippingReturnsPage() {
  const s = useSiteSettings();
  const inside = s?.delivery_inside_dhaka ?? 60;
  const outside = s?.delivery_outside_dhaka ?? 120;
  const wa = s?.whatsapp_display ?? "+880 1322-126233";
  const email = s?.contact_email ?? "hello@sumeraluxe.com";

  return (
    <article className="mx-auto max-w-3xl px-4 py-14 md:px-8 md:py-20">
      <header className="text-center">
        <div className="text-[11px] uppercase tracking-[0.35em] text-gold">Customer Care</div>
        <h1 className="mt-2 font-serif text-4xl md:text-5xl">Shipping &amp; Returns</h1>
        <div className="gold-rule mt-4" />
        <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Every Suméra Luxe order is packed by hand in Dhaka and delivered
          across Bangladesh with cash on delivery.
        </p>
      </header>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border/60 bg-cream/40 p-6">
          <div className="text-[11px] uppercase tracking-[0.25em] text-gold">Inside Dhaka</div>
          <div className="mt-2 font-serif text-2xl">Tk. {inside}</div>
          <p className="mt-2 text-sm text-muted-foreground">1–2 working days after order confirmation.</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-cream/40 p-6">
          <div className="text-[11px] uppercase tracking-[0.25em] text-gold">Outside Dhaka</div>
          <div className="mt-2 font-serif text-2xl">Tk. {outside}</div>
          <p className="mt-2 text-sm text-muted-foreground">3–5 working days anywhere in Bangladesh.</p>
        </div>
      </section>

      <div className="mt-12 space-y-8 text-[15px] leading-[1.85] text-foreground/85">
        <Section title="Order confirmation">
          Once you place an order our team will call or WhatsApp you to
          confirm your name, address and items. Your order is dispatched
          only after this confirmation.
        </Section>

        <Section title="Delivery partners">
          We work with trusted courier partners across Bangladesh —
          including Dhaka city, all divisional cities and upazila-level
          delivery. A tracking update is shared with you over WhatsApp
          once your parcel is dispatched. You can also track any order
          from our <a href="/track" className="text-gold underline">Track Order</a> page using the phone number used at checkout.
        </Section>

        <Section title="Cash on Delivery">
          Payment is collected in cash by our courier at the time of
          delivery. Please have the exact amount ready. We do not
          currently accept online, card or mobile financial services
          payments.
        </Section>

        <Section title="Return & refund policy">
          Because beauty and personal-care products are hygiene-sensitive,
          we accept returns only in the following cases:
          <ul className="mt-3 ml-5 list-disc space-y-1">
            <li>The product arrived damaged or leaking.</li>
            <li>You received the wrong item or variant.</li>
            <li>The product is expired or defective at the time of delivery.</li>
          </ul>
          <p className="mt-3">
            To raise a return, contact us on WhatsApp {wa} within 24 hours
            of delivery with clear photos of the parcel and product. Once
            approved, we will arrange a replacement or a full refund. Used
            or opened items outside the cases above are not eligible for
            return.
          </p>
        </Section>

        <Section title="Order cancellation">
          You can cancel your order free of charge any time before it is
          dispatched. Please message us on WhatsApp as soon as possible so
          we can stop the shipment.
        </Section>

        <Section title="Failed or refused deliveries">
          If a confirmed order is refused at the door or cannot be
          delivered after multiple attempts, we may pause cash-on-delivery
          for future orders from that number. Please only confirm orders
          you intend to receive.
        </Section>

        <Section title="Need help?">
          Our customer care team is available 7 days a week. WhatsApp {wa} or email {email}.
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