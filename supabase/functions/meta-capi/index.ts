import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { ALLOWED_EVENT_NAMES, CORS_HEADERS, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "./config.ts";
import { buildEventPayload, buildUserData, sendMetaEvent } from "./meta.ts";
import type { CapiRequestBody, TrackingSettingsRow } from "./types.ts";
import { debugLog, getClientIp, jsonResponse, safeErrorLog } from "./utils.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  let body: CapiRequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON" }, 400);
  }

  if (!body?.event_name || !ALLOWED_EVENT_NAMES.has(body.event_name)) {
    return jsonResponse({ ok: false, error: "Unsupported event_name" }, 400);
  }

  if (!body.event_id) {
    return jsonResponse({ ok: false, error: "event_id is required for deduplication" }, 400);
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      safeErrorLog("Missing Supabase service configuration", new Error("config"));
      return jsonResponse({ ok: false, error: "Server misconfigured" }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase
      .from("tracking_settings")
      .select("meta_pixel_id, meta_access_token, meta_capi_enabled, meta_test_event_code")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      safeErrorLog("Failed to load tracking settings", error);
      return jsonResponse({ ok: false, error: "Server error" }, 500);
    }

    const settings = data as TrackingSettingsRow | null;

    if (!settings?.meta_capi_enabled || !settings.meta_pixel_id || !settings.meta_access_token) {
      // CAPI disabled or not configured — silently skip, never break the caller's flow.
      debugLog("CAPI disabled or unconfigured, skipping", { event_name: body.event_name });
      return jsonResponse({ ok: true, skipped: true });
    }

    const clientIp = getClientIp(req);
    const clientUserAgent = req.headers.get("user-agent") ?? undefined;

    const userData = await buildUserData(body, clientIp, clientUserAgent);
    const payload = buildEventPayload(body, userData);

    const result = await sendMetaEvent(
      settings.meta_pixel_id,
      settings.meta_access_token,
      payload,
      settings.meta_test_event_code,
    );

    debugLog("Dispatched event to Meta", { event_name: body.event_name, event_id: body.event_id, status: result.status });

    return jsonResponse({ ok: result.ok });
  } catch (err) {
    safeErrorLog("Unhandled error in meta-capi", err);
    return jsonResponse({ ok: false, error: "Internal error" }, 500);
  }
});
