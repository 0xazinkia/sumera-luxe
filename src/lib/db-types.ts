export type Category = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  image_url: string | null;
  sort_order: number;
};

export type ProductImage = {
  id: string;
  product_id?: string;
  url: string;
  alt: string | null;
  sort_order: number;
};

export type Variant = {
  id: string;
  product_id?: string;
  color: string;
  size: string | null;
  price: number;
  discount_price: number | null;
  image_url: string | null;
  stock: number;
  sort_order: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  brand_name: string;
  category_id: string | null;
  description: string | null;
  video_url: string | null;
  size_chart_url: string | null;
  base_price: number;
  discount_price: number | null;
  stock: number;
  is_featured: boolean;
  is_new: boolean;
  sort_order: number;
  updated_at: string;
  images: ProductImage[];
  variants: Variant[];
  category?: { slug: string; name: string } | null;
};

export type HeroSlide = {
  id: string;
  image_url: string;
  mobile_image_url: string | null;
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  cta_label: string | null;
  cta_href: string | null;
  sort_order: number;
  is_active: boolean;
};

export type Banner = {
  id: string;
  slot: string;
  image_url: string;
  mobile_image_url: string | null;
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  cta_label: string | null;
  cta_href: string | null;
  sort_order: number;
  is_active: boolean;
};

export type SiteSettings = {
  id: number;
  brand_name: string;
  brand_tagline: string;
  whatsapp_number: string;
  whatsapp_display: string;
  contact_email: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  delivery_inside_dhaka: number;
  delivery_outside_dhaka: number;
  currency_symbol: string;
  about_text: string | null;
  gtm_head_snippet: string | null;
  gtm_body_snippet: string | null;
};

export type DiscountCode = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  min_subtotal: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
};

export type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  address: string;
  city: string | null;
  area: "inside" | "outside";
  delivery_fee: number;
  subtotal: number;
  total: number;
  notes: string | null;
  status: string;
  created_at: string;
  discount_code?: string | null;
  discount_amount?: number;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  variant_label: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
  image_url: string | null;
};

export function productPrice(p: Pick<Product, "base_price" | "discount_price">) {
  return p.discount_price ?? p.base_price;
}

export function variantPrice(v: Pick<Variant, "price" | "discount_price">) {
  return v.discount_price ?? v.price;
}