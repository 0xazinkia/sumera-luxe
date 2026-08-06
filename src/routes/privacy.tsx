import { createFileRoute } from "@tanstack/react-router";
import { useSiteSettings } from "@/lib/hooks";

const URL = "https://sumeraluxe.com/privacy";
const TITLE = "Privacy Policy — Suméra Luxe Bangladesh";
const DESC =
  "How Suméra Luxe collects, uses and protects the personal information of customers in Bangladesh — including orders, delivery, WhatsApp and marketing.";

export const Route = createFileRoute("/privacy")({
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
  component: PrivacyPage,
});

function PrivacyPage() {
  const s = useSiteSettings();
  const brand = s?.brand_name ?? "Suméra Luxe";
  const email = s?.contact_email ?? "hello@sumeraluxe.com";
  const wa = s?.whatsapp_display ?? "+880 1322-126233";
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 md:px-8 md:py-20">
      <header className="text-center">
        <div className="text-[11px] uppercase tracking-[0.35em] text-gold">Legal</div>
        <h1 className="mt-2 font-serif text-4xl md:text-5xl">Privacy Policy</h1>
        <div className="gold-rule mt-4" />
        <p className="mt-4 text-xs text-muted-foreground">Last updated: 26 July 2026</p>
      </header>

      <div className="prose-invert mt-10 space-y-8 text-[15px] leading-[1.85] text-foreground/85">
        <p>
          {brand} ("we", "us", "our") respects your privacy. This policy
          explains what personal information we collect from customers in
          Bangladesh, how we use it and the choices you have. By using
          sumeraluxe.com or ordering from us, you agree to this policy.
        </p>

        <Section title="1. Information we collect">
          <ul className="ml-5 list-disc space-y-1">
            <li>Name, phone number and delivery address you provide at checkout.</li>
            <li>Order details, product preferences and purchase history.</li>
            <li>Messages you send us over WhatsApp, email or Facebook.</li>
            <li>Basic device and usage data, such as page views and location, which help us keep the site working properly.</li>
          </ul>
        </Section>

        <Section title="2. How we use your information">
          <ul className="ml-5 list-disc space-y-1">
            <li>To confirm, pack and deliver your order anywhere in Bangladesh.</li>
            <li>To contact you about your order via phone, SMS or WhatsApp.</li>
            <li>To provide customer care, handle returns and answer questions.</li>
            <li>To improve our website, product mix and service quality.</li>
            <li>To send you offers or new arrivals — only if you have opted in.</li>
          </ul>
        </Section>

        <Section title="3. Sharing your information">
          We do not sell your personal data. We share the minimum details
          required with our delivery partners (courier services operating
          inside and outside Dhaka) so your order can reach you, and with
          service providers that host our website or send messages on our
          behalf. All partners are required to keep your data confidential.
        </Section>

        <Section title="4. Cash on Delivery">
          For cash-on-delivery orders we do not collect or store any card,
          bank or mobile financial account details. Payment is handled in
          person with our courier at the time of delivery.
        </Section>

        <Section title="5. Cookies and data usage">
          We use cookies to keep the site functioning smoothly and to improve
          the shopping experience. You can disable cookies in your browser at
          any time; some parts of the site may not work as well without them.
        </Section>

        <Section title="6. Data retention">
          We keep order and customer data for as long as needed to fulfil
          your order, provide after-sales care and meet our legal and tax
          obligations under Bangladesh law.
        </Section>

        <Section title="7. Your rights">
          You may ask us to view, correct or delete the personal data we
          hold about you, or to stop marketing messages, by contacting us
          at {email} or WhatsApp {wa}.
        </Section>

        <Section title="8. Children">
          Our products and site are intended for customers aged 18 and
          above. We do not knowingly collect data from minors.
        </Section>

        <Section title="9. Updates to this policy">
          We may update this policy from time to time. The latest version
          will always be available on this page with the updated date above.
        </Section>

        <Section title="10. Contact us">
          {brand}, Dhaka, Bangladesh. Email: {email}. WhatsApp: {wa}.
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