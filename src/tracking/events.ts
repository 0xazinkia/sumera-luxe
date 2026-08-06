import type { TrackingItem } from "./types";

export type ProductLike = {
  id: string;
  name: string;
  slug: string;
  category?: {
    name?: string | null;
    slug?: string | null;
  } | null;
};

export type CartLineLike = {
  productId: string;
  name: string;
  variantLabel?: string;
  unitPrice: number;
  quantity: number;
};

export function buildProductItemPayload(
  product: ProductLike,
  price: number,
  quantity = 1,
  variantLabel?: string,
  brandName?: string | null,
): TrackingItem {
  return {
    item_id: product.id,
    item_name: product.name,
    item_brand: brandName ?? "Suméra Luxe",
    item_category: product.category?.name ?? undefined,
    item_variant: variantLabel ?? undefined,
    price,
    quantity,
  };
}

export function buildViewItemPayload(
  product: ProductLike,
  price: number,
  brandName?: string | null,
  pageLocation?: string,
) {
  return {
    page_location: pageLocation,
    items: [buildProductItemPayload(product, price, 1, undefined, brandName)],
    value: price,
  };
}

export function buildAddToCartPayload(
  product: ProductLike,
  price: number,
  quantity: number,
  variantLabel?: string,
  brandName?: string | null,
  pageLocation?: string,
) {
  return {
    page_location: pageLocation,
    items: [buildProductItemPayload(product, price, quantity, variantLabel, brandName)],
    value: price * quantity,
  };
}

export function buildCheckoutPayload(
  items: CartLineLike[],
  subtotal: number,
  delivery: number,
  discountAmount: number,
  brandName?: string | null,
  pageLocation?: string,
) {
  const trackingItems: TrackingItem[] = items.map((item) => ({
    item_id: item.productId,
    item_name: item.name,
    item_brand: brandName ?? "Suméra Luxe",
    item_category: undefined,
    item_variant: item.variantLabel ?? undefined,
    price: item.unitPrice,
    quantity: item.quantity,
  }));

  return {
    page_location: pageLocation,
    items: trackingItems,
    value: Math.max(0, subtotal - discountAmount) + delivery,
    shipping: delivery,
  };
}

export function buildShippingInfoPayload(
  district: string,
  area: "inside" | "outside",
  delivery: number,
  items: CartLineLike[],
  subtotal: number,
  discountAmount: number,
  brandName?: string | null,
  pageLocation?: string,
) {
  const trackingItems: TrackingItem[] = items.map((item) => ({
    item_id: item.productId,
    item_name: item.name,
    item_brand: brandName ?? "Suméra Luxe",
    item_category: undefined,
    item_variant: item.variantLabel ?? undefined,
    price: item.unitPrice,
    quantity: item.quantity,
  }));

  return {
    page_location: pageLocation,
    items: trackingItems,
    value: Math.max(0, subtotal - discountAmount) + delivery,
    shipping: delivery,
    shipping_tier: area === "inside" ? "Inside Dhaka" : "Outside Dhaka",
    custom_data: {
      district,
      delivery_area: area,
    },
  };
}

export function buildPurchasePayload(
  orderNumber: string,
  total: number,
  items: CartLineLike[],
  brandName?: string | null,
  pageLocation?: string,
) {
  const trackingItems: TrackingItem[] = items.map((item) => ({
    item_id: item.productId,
    item_name: item.name,
    item_brand: brandName ?? "Suméra Luxe",
    item_category: undefined,
    item_variant: item.variantLabel ?? undefined,
    price: item.unitPrice,
    quantity: item.quantity,
  }));

  return {
    page_location: pageLocation,
    items: trackingItems,
    value: total,
    transaction_id: orderNumber || undefined,
    affiliation: brandName ?? "Suméra Luxe",
  };
}
