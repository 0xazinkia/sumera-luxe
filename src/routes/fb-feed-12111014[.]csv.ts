import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

const BASE_URL = "https://sumeraluxe.com";
const CURRENCY = "BDT";
const CSV_BOM = "\ufeff";

function quote(value: string | number | null | undefined) {
  if (value == null) return "";
  return `"${String(value).replace(/"/g, '""')}"`;
}

function productUrl(slug: string) {
  return `${BASE_URL}/products/${slug}`;
}

function imageUrl(url: string | null | undefined) {
  if (!url) return "";
  return url.startsWith("http") ? url : `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function getEffectivePrices(
  variantPrice: number | null,
  variantDiscountPrice: number | null,
  productBasePrice: number,
  productDiscountPrice: number | null,
) {
  const regularPrice = variantPrice ?? productBasePrice;
  const salePrice = variantDiscountPrice ?? productDiscountPrice;
  return {
    price: `${regularPrice.toFixed(2)} ${CURRENCY}`,
    sale_price:
      salePrice != null && salePrice < regularPrice
        ? `${salePrice.toFixed(2)} ${CURRENCY}`
        : "",
  };
}

function normalizeText(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

export const Route = createFileRoute("/fb-feed-12111014.csv")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { data: settings, error: settingsError } = await supabase
            .from("site_settings")
            .select("brand_name")
            .eq("id", 1)
            .maybeSingle();

          const { data: products, error: productsError } = await supabase
            .from("products")
            .select(
              `id, slug, name, description, base_price, discount_price, stock, brand_name, category:categories(name), images:product_images(id,url,sort_order), variants:product_variants(id,color,size,price,discount_price,image_url,stock,sort_order), video_url`,
            )
            .order("sort_order", { ascending: true });

          if (settingsError) throw settingsError;
          if (productsError) throw productsError;

          const defaultBrand = settings?.brand_name ?? "Sumera Luxe";
          const rows: string[] = [];
          rows.push(
            [
              "id",
              "title",
              "description",
              "availability",
              "condition",
              "price",
              "link",
              "image_link",
              "brand",
              "google_product_category",
              "fb_product_category",
              "quantity_to_sell_on_facebook",
              "sale_price",
              "sale_price_effective_date",
              "item_group_id",
              "gender",
              "color",
              "size",
              "age_group",
              "material",
              "pattern",
              "shipping",
              "shipping_weight",
              "offer_disclaimer",
              "offer_disclaimer_url",
              "video[0].url",
              "video[0].tag[0]",
              "gtin",
              "style[0]",
            ].join(","),
          );

          for (const product of (products ?? []) as any[]) {
            if (!product?.slug || !product?.name) continue;
            const categoryName = product?.category?.name ?? "";
            const productImages = Array.isArray(product.images)
              ? [...product.images].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
              : [];
            const firstImage = imageUrl(productImages[0]?.url);
            const variants = Array.isArray(product.variants)
              ? [...product.variants].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
              : [];

            const addRow = (variant: any | null) => {
              const variantImage = imageUrl(variant?.image_url ?? null) || firstImage;
              const stock = variant?.stock ?? product.stock ?? 0;
              const { price, sale_price } = getEffectivePrices(
                variant?.price ?? null,
                variant?.discount_price ?? null,
                product.base_price,
                product.discount_price,
              );
              const availability = stock > 0 ? "in stock" : "out of stock";
              const productBrand = product.brand_name?.trim() || defaultBrand;
              rows.push(
                [
                  quote(variant?.id ?? product.id),
                  quote(product.name),
                  quote(normalizeText(product.description)),
                  quote(availability),
                  quote("new"),
                  quote(price),
                  quote(productUrl(product.slug)),
                  quote(variantImage),
                  quote(productBrand),
                  quote(categoryName),
                  quote(categoryName),
                  quote(stock),
                  quote(sale_price),
                  quote(""),
                  quote(variant ? product.id : ""),
                  quote(""),
                  quote(variant?.color ?? ""),
                  quote(variant?.size ?? ""),
                  quote(""),
                  quote(""),
                  quote(""),
                  quote(""),
                  quote(""),
                  quote(""),
                  quote(""),
                  quote(product.video_url ?? ""),
                  quote(""),
                  quote(""),
                  quote(""),
                ].join(","),
              );
            };

            if (variants.length > 0) {
              for (const variant of variants) {
                addRow(variant);
              }
            } else {
              addRow(null);
            }
          }

          return new Response(CSV_BOM + rows.join("\n"), {
            headers: {
              "Content-Type": "text/csv; charset=utf-8",
              "Cache-Control": "public, max-age=3600",
            },
          });
        } catch (error: unknown) {
          let message: string;
          if (error instanceof Error) {
            message = error.stack ?? error.message;
          } else if (typeof error === "object" && error !== null) {
            try {
              message = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
            } catch {
              message = String(error);
            }
          } else {
            message = String(error);
          }
          console.error("Facebook feed generation error:", error);
          return new Response(`Error generating Facebook feed:\n${message}`, {
            status: 200,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
            },
          });
        }
      },
    },
  },
});
