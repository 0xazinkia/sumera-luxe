import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  Category,
  Product,
  HeroSlide,
  Banner,
  SiteSettings,
  DiscountCode,
} from "@/lib/db-types";

const PRODUCT_SELECT =
  "*, images:product_images(*), variants:product_variants(*), category:categories(slug,name)";

function sortProduct(p: any): Product {
  return {
    ...p,
    images: (p.images ?? []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order),
    variants: (p.variants ?? []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order),
  };
}

export const categoriesQuery = () =>
  queryOptions({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Category[];
    },
    staleTime: 60_000,
  });

export const productsQuery = () =>
  queryOptions({
    queryKey: ["products"],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as any[]).map(sortProduct);
    },
    staleTime: 30_000,
  });

export const productBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: async (): Promise<Product | null> => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data ? sortProduct(data) : null;
    },
  });

export const categoryBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["category", slug],
    queryFn: async (): Promise<Category | null> => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Category | null;
    },
  });

export const heroSlidesQuery = () =>
  queryOptions({
    queryKey: ["hero-slides"],
    queryFn: async (): Promise<HeroSlide[]> => {
      const { data, error } = await supabase
        .from("hero_slides" as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return ((data as any) ?? []) as HeroSlide[];
    },
    staleTime: 60_000,
  });

export const bannersQuery = () =>
  queryOptions({
    queryKey: ["banners"],
    queryFn: async (): Promise<Banner[]> => {
      const { data, error } = await supabase
        .from("banners" as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return ((data as any) ?? []) as Banner[];
    },
    staleTime: 60_000,
  });

export const siteSettingsQuery = () =>
  queryOptions({
    queryKey: ["site-settings"],
    queryFn: async (): Promise<SiteSettings | null> => {
      const { data, error } = await supabase
        .from("site_settings" as any)
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
    staleTime: 60_000,
  });

export function whatsappHrefFor(number: string, message: string) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export const discountCodesQuery = () =>
  queryOptions({
    queryKey: ["discount-codes"],
    queryFn: async (): Promise<DiscountCode[]> => {
      const { data, error } = await supabase
        .from("discount_codes" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data as any) ?? []) as DiscountCode[];
    },
  });

export type DiscountResult =
  | { ok: true; code: DiscountCode; amount: number }
  | { ok: false; reason: string };

export async function validateDiscountCode(
  raw: string,
  subtotal: number,
): Promise<DiscountResult> {
  const code = raw.trim();
  if (!code) return { ok: false, reason: "Enter a code." };
  const { data, error } = await supabase
    .from("discount_codes" as any)
    .select("*")
    .ilike("code", code)
    .eq("is_active", true)
    .maybeSingle();
  if (error) return { ok: false, reason: "Could not check that code." };
  const dc = data as any as DiscountCode | null;
  if (!dc) return { ok: false, reason: "Invalid code." };
  if (dc.expires_at && new Date(dc.expires_at) < new Date())
    return { ok: false, reason: "This code has expired." };
  if (dc.max_uses != null && dc.used_count >= dc.max_uses)
    return { ok: false, reason: "This code has reached its usage limit." };
  if (subtotal < Number(dc.min_subtotal))
    return { ok: false, reason: `Minimum order of ${Number(dc.min_subtotal)} required.` };
  const amount =
    dc.type === "percent"
      ? Math.round((subtotal * Number(dc.value)) / 100)
      : Math.min(Number(dc.value), subtotal);
  return { ok: true, code: dc, amount };
}

export function productEnquiryMessage(brand: string, name: string, url: string) {
  return `Hello ${brand},\n\nI want to know about this product.\n\nProduct Name:\n${name}\n\nProduct Link:\n${url}\n\nPlease provide more information.`;
}