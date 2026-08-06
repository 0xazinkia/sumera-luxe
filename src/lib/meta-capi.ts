// Client-side bridge to the meta-capi Supabase Edge Function.
// This module NEVER hashes or reads secrets — it only forwards event data
// that the browser Pixel already has access to (same event_id for dedup).
import { supabase } from "@/integrations/supabase/client";
import type { TrackingEventName, TrackingEventPayload } from "@/tracking/types";

const EVENT_NAME_MAP: Partial<Record<TrackingEventName, string>> = {
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  purchase: "Purchase",
};

// Guards against sending duplicate CAPI events for rapid repeat UI actions
// (e.g. double-clicking "Add to cart") when the caller doesn't pass a stable event_id.
const RECENT_DISPATCH_WINDOW_MS = 1500;
const recentDispatchSignatures = new Map<string, number>();

function isDuplicateDispatch(signature: string): boolean {
  const now = Date.now();
  const lastSeen = recentDispatchSignatures.get(signature);

  for (const [key, timestamp] of recentDispatchSignatures) {
    if (now - timestamp > RECENT_DISPATCH_WINDOW_MS) recentDispatchSignatures.delete(key);
  }

  recentDispatchSignatures.set(signature, now);
  return lastSeen !== undefined && now - lastSeen <= RECENT_DISPATCH_WINDOW_MS;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1] ?? "") : null;
}

export type MetaCapiUserData = {
  email?: string | null;
  phone?: string | null;
};

// Fire-and-forget: CAPI failures must never interrupt the browser tracking flow.
export function dispatchMetaCapiEvent(
  eventName: TrackingEventName,
  eventId: string,
  payload: TrackingEventPayload,
  userData: MetaCapiUserData = {},
) {
  const metaEventName = EVENT_NAME_MAP[eventName];
  if (!metaEventName || typeof window === "undefined") return;

  // Signature is content-based (not event_id) so it also catches accidental
  // repeat actions (e.g. double-clicked "Add to cart") that each mint a fresh event_id.
  const signature = `${metaEventName}:${payload.transaction_id ?? ""}:${(payload.content_ids ?? []).join(",")}:${payload.value ?? ""}`;
  if (isDuplicateDispatch(signature)) return;

  const body = {
    event_name: metaEventName,
    event_id: eventId,
    event_time: Math.floor(Date.now() / 1000),
    event_source_url: payload.event_source_url ?? window.location.href,
    user_data: {
      email: userData.email ?? undefined,
      phone: userData.phone ?? undefined,
      fbp: getCookie("_fbp"),
      fbc: getCookie("_fbc"),
    },
    custom_data: {
      currency: payload.currency,
      value: payload.value,
      content_type: payload.content_type,
      content_ids: payload.content_ids,
      contents: payload.contents,
      num_items: payload.num_items,
      order_id: payload.transaction_id ?? undefined,
      transaction_id: payload.transaction_id ?? undefined,
    },
  };

  supabase.functions.invoke("meta-capi", { body }).catch(() => {
    // Swallow errors — server-side tracking is best-effort and must not block UX.
  });
}
