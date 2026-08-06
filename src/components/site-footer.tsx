import { useQuery } from "@tanstack/react-query";
import { Facebook, MessageCircle, Mail } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { whatsappHref } from "@/lib/config";
import { siteSettingsQuery } from "@/lib/queries";

export function SiteFooter() {
  const settingsQuery = useQuery(siteSettingsQuery());
  const settings = settingsQuery.data ?? null;
  const isSettingsLoading = settingsQuery.isPending || settingsQuery.isFetching;
  const brand = settings?.brand_name ?? "Suméra Luxe";
  const tagline = settings?.brand_tagline ?? "Beauty · Skincare · Gifts";
  const email = settings?.contact_email ?? "hello@sumeraluxe.com";
  const facebook = settings?.facebook_url ?? "#";
  const waNumber = settings?.whatsapp_number ?? "8801322126233";
  const waDisplay = settings?.whatsapp_display ?? "+880 1322-126233";
  const about =
    settings?.about_text ??
    "A quiet luxury house for the modern woman — considered fragrances, refined skincare, and gifts made to be remembered.";

  if (isSettingsLoading) {
    return (
      <footer className="mt-24 border-t border-border/60 bg-[color-mix(in_oklab,var(--cream)_92%,var(--gold)_8%)]">
        <div className="mx-auto max-w-7xl px-4 py-14 md:px-8">
          <div className="grid gap-10 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-3">
                <div className="h-5 w-24 animate-pulse rounded bg-muted/70" />
                <div className="h-4 w-full animate-pulse rounded bg-muted/50" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted/50" />
              </div>
            ))}
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="mt-24 border-t border-border/60 bg-[color-mix(in_oklab,var(--cream)_92%,var(--gold)_8%)]">
      <div className="mx-auto max-w-7xl px-4 py-14 pb-24 md:px-8 md:pb-14">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="font-serif text-2xl">{brand}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.25em] text-gold">{tagline}</div>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{about}</p>
          </div>

          <div>
            <h4 className="font-serif text-lg">Company</h4>
            <div className="mt-4 flex flex-col gap-2 text-sm text-foreground/80">
              <Link to="/about" className="hover:text-gold">About {brand}</Link>
              <Link to="/privacy" className="hover:text-gold">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-gold">Terms &amp; Conditions</Link>
              <Link to="/shipping-returns" className="hover:text-gold">Shipping &amp; Returns</Link>
            </div>
          </div>

          <div>
            <h4 className="font-serif text-lg">Contact</h4>
            <div className="mt-4 flex flex-col gap-3 text-sm text-foreground/80">
              <a href={whatsappHref(`Hello ${brand}, I'd like to know more.`, waNumber)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-gold">
                <MessageCircle className="size-4" /> {waDisplay}
              </a>
              <a href={`mailto:${email}`} className="inline-flex items-center gap-2 hover:text-gold">
                <Mail className="size-4" /> {email}
              </a>
              <a href={facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-gold">
                <Facebook className="size-4" /> Facebook
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 hidden flex-col items-center gap-2 border-t border-border/60 pt-6 text-center text-xs text-muted-foreground md:flex">
          <div className="gold-rule" />
          <p>© {new Date().getFullYear()} {brand}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}