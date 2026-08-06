import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://sumeraluxe.com";

interface Entry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
  lastmod?: string;
  image?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: Entry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/products", changefreq: "weekly", priority: "0.9" },
          { path: "/categories", changefreq: "weekly", priority: "0.8" },
          { path: "/track", changefreq: "monthly", priority: "0.4" },
          { path: "/about", changefreq: "monthly", priority: "0.5" },
          { path: "/privacy", changefreq: "yearly", priority: "0.3" },
          { path: "/terms", changefreq: "yearly", priority: "0.3" },
          { path: "/shipping-returns", changefreq: "monthly", priority: "0.5" },
          { path: "/blog/best-perfumes-for-women", changefreq: "monthly", priority: "0.6" },
        ];

        try {
          const supa = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
          );
          const [{ data: cats }, { data: prods }] = await Promise.all([
            supa.from("categories").select("slug, updated_at, image_url").eq("is_active", true),
            supa.from("products").select("slug, updated_at, image_url").eq("is_active", true),
          ]);
          for (const c of cats ?? []) {
            if (c.slug) entries.push({ path: `/category/${c.slug}`, changefreq: "weekly", priority: "0.7", lastmod: (c as any).updated_at ?? undefined, image: (c as any).image_url ?? undefined });
          }
          for (const p of prods ?? []) {
            if (p.slug) entries.push({ path: `/products/${p.slug}`, changefreq: "weekly", priority: "0.7", lastmod: (p as any).updated_at ?? undefined, image: (p as any).image_url ?? undefined });
          }
        } catch {
          // Best-effort: ship static entries if the DB is unreachable.
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${new Date(e.lastmod).toISOString()}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            e.image
              ? `    <image:image>\n      <image:loc>${(e.image as string).startsWith("/") ? BASE_URL + (e.image as string) : e.image}</image:loc>\n    </image:image>`
              : null,
            `  </url>`,
          ].filter(Boolean).join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});