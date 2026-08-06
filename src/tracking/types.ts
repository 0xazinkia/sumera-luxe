export type TrackingEventName =
  | "page_view"
  | "view_item"
  | "add_to_cart"
  | "begin_checkout"
  | "add_shipping_info"
  | "purchase";

export type TrackingItem = {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  item_variant?: string;
  price: number;
  quantity: number;
};

export type TrackingContentItem = {
  id: string;
  quantity?: number;
  price?: number;
};

export type TrackingEventPayload = {
  event_id?: string;
  timestamp?: string;
  page_location?: string;
  page_title?: string;
  user_id?: string | null;
  session_id?: string | null;
  action_source?: string;
  event_source_url?: string;
  client_user_agent?: string;
  fbp?: string | null;
  fbc?: string | null;
  user_data?: Record<string, unknown>;
  custom_data?: Record<string, unknown>;
  currency?: string;
  value?: number;
  shipping?: number;
  tax?: number;
  coupon?: string | null;
  transaction_id?: string | null;
  items?: TrackingItem[];
  content_ids?: string[];
  contents?: TrackingContentItem[];
  content_type?: "product" | "product_group";
  num_items?: number;
  shipping_tier?: string;
  payment_type?: string;
};
