import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";

import { MobileBottomBar } from "../components/mobile-bottom-bar";
import { CartProvider } from "../lib/cart";
import { useSiteSettings } from "@/lib/hooks";
import { initializeTracking, trackPageView } from "@/tracking";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Suméra Luxe Bangladesh — Luxury Perfume, Skincare & Gifts" },
      { name: "description", content: "Shop luxury perfume, skincare, makeup and gift sets at Suméra Luxe — Bangladesh's quiet-luxury beauty house. Cash on delivery in Dhaka and across Bangladesh." },
      { name: "author", content: "Suméra Luxe" },
      { name: "keywords", content: "luxury perfume Bangladesh, skincare Bangladesh, makeup Dhaka, gift sets Bangladesh, cash on delivery beauty, Suméra Luxe" },
      { property: "og:title", content: "Suméra Luxe Bangladesh — Luxury Perfume, Skincare & Gifts" },
      { property: "og:description", content: "Shop luxury perfume, skincare, makeup and gift sets at Suméra Luxe — Bangladesh's quiet-luxury beauty house. Cash on delivery in Dhaka and across Bangladesh." },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "en_BD" },
      { property: "og:locale:alternate", content: "bn_BD" },
      { property: "og:site_name", content: "Suméra Luxe" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "geo.region", content: "BD" },
      { name: "geo.placename", content: "Dhaka, Bangladesh" },
      { name: "geo.position", content: "23.8103;90.4125" },
      { name: "ICBM", content: "23.8103, 90.4125" },
      { name: "twitter:title", content: "Suméra Luxe Bangladesh — Luxury Perfume, Skincare & Gifts" },
      { name: "twitter:description", content: "Shop luxury perfume, skincare, makeup and gift sets at Suméra Luxe — Bangladesh's quiet-luxury beauty house. Cash on delivery in Dhaka and across Bangladesh." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/b4e784b4-52e2-4f2a-81e0-e90068be5194" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/b4e784b4-52e2-4f2a-81e0-e90068be5194" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600&family=Hind+Siliguri:wght@400;500;600;700&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Suméra Luxe",
          url: "https://sumeraluxe.com",
          description: "Bangladesh's quiet-luxury beauty house for fragrance, skincare and gifts, with cash on delivery nationwide.",
          address: {
            "@type": "PostalAddress",
            addressCountry: "BD",
            addressRegion: "Dhaka",
            addressLocality: "Dhaka",
          },
          areaServed: { "@type": "Country", name: "Bangladesh" },
          contactPoint: {
            "@type": "ContactPoint",
            telephone: "+8801322126233",
            contactType: "customer service",
            areaServed: "BD",
            availableLanguage: ["en", "bn"],
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Suméra Luxe",
          url: "https://sumeraluxe.com",
          inLanguage: ["en-BD", "bn-BD"],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function TrackingRouterObserver() {
  const location = useRouterState({ select: (s) => s.location });
  const lastTrackedPathRef = useRef<string | null>(null);

  useEffect(() => {
    initializeTracking();
  }, []);

  useEffect(() => {
    const pathname = typeof location.pathname === "string" ? location.pathname : String(location.pathname ?? "");
    const search = location.search == null
      ? ""
      : typeof location.search === "string"
      ? location.search
      : typeof (location.search as any).toString === "function"
      ? (location.search as any).toString()
      : "";
    const pathKey = `${pathname}${search}`;

    if (lastTrackedPathRef.current === pathKey) return;

    lastTrackedPathRef.current = pathKey;
    trackPageView({
      page_location: typeof window !== "undefined" ? window.location.href : undefined,
      page_title: typeof document !== "undefined" ? document.title : undefined,
    });
  }, [location.pathname, location.search]);

  return null;
}

function GtmSnippetInjector() {
  const settings = useSiteSettings();

  useEffect(() => {
    const removeInjectedNodes = () => {
      document.querySelectorAll('[data-gtm-snippet="true"]').forEach((node) => node.remove());
    };

    removeInjectedNodes();

    const headMarkup = settings?.gtm_head_snippet?.trim();
    const bodyMarkup = settings?.gtm_body_snippet?.trim();

    if (!headMarkup && !bodyMarkup) return removeInjectedNodes;

    if (headMarkup) {
      const fragment = document.createRange().createContextualFragment(headMarkup);
      Array.from(fragment.childNodes).forEach((node) => {
        if (node instanceof Element) {
          node.setAttribute("data-gtm-snippet", "true");
        }
        document.head.appendChild(node);
      });
    }

    if (bodyMarkup) {
      const fragment = document.createRange().createContextualFragment(bodyMarkup);
      Array.from(fragment.childNodes).forEach((node) => {
        if (node instanceof Element) {
          node.setAttribute("data-gtm-snippet", "true");
        }
        document.body.prepend(node);
      });
    }

    return removeInjectedNodes;
  }, [settings?.gtm_head_snippet, settings?.gtm_body_snippet]);

  return null;
}

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en-BD">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = pathname.startsWith("/admin");

  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <Toaster position="bottom-right" />
        <TrackingRouterObserver />
        <GtmSnippetInjector />
        {isAdmin ? (
          <Outlet />
        ) : (
          <>
            <div className="flex min-h-screen flex-col">
              <SiteHeader />
              <main className="flex-1 pb-16 md:pb-0">
                <Outlet />
              </main>
              <SiteFooter />
            </div>
            <MobileBottomBar />
          </>
        )}
      </CartProvider>
    </QueryClientProvider>
  );
}
