// Shared configuration for the meta-capi edge function.
export const META_GRAPH_API_VERSION = "v21.0";

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
export const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Verbose logging only in non-production environments; never logs secrets.
export const IS_DEBUG = (Deno.env.get("ENVIRONMENT") ?? Deno.env.get("DENO_ENV") ?? "production") !== "production";

export const ALLOWED_EVENT_NAMES = new Set([
  "Purchase",
  "InitiateCheckout",
  "AddToCart",
  "ViewContent",
]);

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
