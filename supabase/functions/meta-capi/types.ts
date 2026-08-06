// Types for the meta-capi edge function request/response contract.

export type MetaEventName = "Purchase" | "InitiateCheckout" | "AddToCart" | "ViewContent";

export type IncomingUserData = {
  email?: string | null;
  phone?: string | null;
  fbp?: string | null;
  fbc?: string | null;
};

export type IncomingContentItem = {
  id: string;
  quantity?: number;
  item_price?: number;
};

export type IncomingCustomData = {
  currency?: string;
  value?: number;
  content_type?: string;
  content_ids?: string[];
  contents?: IncomingContentItem[];
  num_items?: number;
  order_id?: string;
  transaction_id?: string;
};

export type CapiRequestBody = {
  event_name: MetaEventName;
  event_id: string;
  event_time?: number;
  event_source_url?: string;
  user_data?: IncomingUserData;
  custom_data?: IncomingCustomData;
};

export type HashedUserData = {
  em?: string[];
  ph?: string[];
  fbp?: string;
  fbc?: string;
  client_ip_address?: string;
  client_user_agent?: string;
};

export type MetaEventPayload = {
  event_name: MetaEventName;
  event_time: number;
  event_id: string;
  action_source: "website";
  event_source_url?: string;
  user_data: HashedUserData;
  custom_data?: IncomingCustomData;
};

export type TrackingSettingsRow = {
  meta_pixel_id: string | null;
  meta_access_token: string | null;
  meta_capi_enabled: boolean;
  meta_test_event_code: string | null;
};
