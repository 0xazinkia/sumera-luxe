import { createEventId, createPurchaseEventId } from "./eventId";
import { logTrackingEvent } from "./debug";
import { dispatchMetaCapiEvent } from "@/lib/meta-capi";
import { TRACKING_ACTION_SOURCE, TRACKING_CURRENCY, TRACKING_DEFAULT_SHIPPING, TRACKING_DEFAULT_TAX } from "./constants";
import type { TrackingEventName, TrackingEventPayload, TrackingItem } from "./types";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

function getPageLocation() {
  if (typeof window === "undefined") return "";
  return window.location.href;
}

function getPageTitle() {
  if (typeof window === "undefined") return "";
  return document.title;
}

function getSessionId() {
  if (typeof window === "undefined") return null;

  try {
    const existing = window.sessionStorage.getItem("sumera_tracking_session_id");
    if (existing) return existing;

    const id = createEventId("session");
    window.sessionStorage.setItem("sumera_tracking_session_id", id);
    return id;
  } catch {
    return null;
  }
}

function getUserId() {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem("sumera_tracking_user_id");
  } catch {
    return null;
  }
}

function getCookie(name: string) {
  if (typeof document === "undefined") return null;

  const value = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`));

  if (!value) return null;
  return decodeURIComponent(value.split("=")[1] ?? "");
}

function getFbp() {
  return getCookie("_fbp");
}

function getFbc() {
  const cookieValue = getCookie("_fbc");
  if (cookieValue) return cookieValue;

  // Fallback per Meta's guidance: synthesize fbc from the fbclid query param
  // when the Pixel hasn't set the _fbc cookie yet (e.g. first ad click-through).
  if (typeof window === "undefined") return null;

  try {
    const fbclid = new URL(window.location.href).searchParams.get("fbclid");
    if (fbclid) {
      const synthesized = `fb.1.${Date.now()}.${fbclid}`;
      window.sessionStorage.setItem("sumera_tracking_fbc_fallback", synthesized);
      return synthesized;
    }

    return window.sessionStorage.getItem("sumera_tracking_fbc_fallback");
  } catch {
    return null;
  }
}

function getClientUserAgent() {
  if (typeof navigator === "undefined") return undefined;
  return navigator.userAgent;
}

function getItemsValue(items: TrackingItem[]) {
  return items.reduce((value, item) => value + item.price * item.quantity, 0);
}

function getContentIds(items: TrackingItem[]) {
  return items.map((item) => item.item_id).filter(Boolean);
}

function getContents(items: TrackingItem[]) {
  return items.map((item) => ({ id: item.item_id, quantity: item.quantity }));
}

function getNumItems(items: TrackingItem[]) {
  return items.reduce((count, item) => count + item.quantity, 0);
}

export function initializeTracking() {
  if (typeof window === "undefined") return;

  if (!Array.isArray(window.dataLayer)) {
    window.dataLayer = [];
  }
}

export function pushDataLayer(eventName: TrackingEventName, payload: TrackingEventPayload = {}) {
  if (typeof window === "undefined") return null;

  initializeTracking();

  const eventTime = payload.timestamp ?? new Date().toISOString();
  const items = payload.items ?? [];
  const value = typeof payload.value === "number" ? payload.value : getItemsValue(items);
  const currency = payload.currency ?? TRACKING_CURRENCY;
  const contentIds = payload.content_ids ?? items.map((item) => item.item_id);
  const contents = payload.contents ?? items.map((item) => ({
    id: item.item_id,
    quantity: item.quantity,
  }));
  const numItems = payload.num_items ?? items.reduce((sum, item) => sum + item.quantity, 0);

  const event = {
    event: eventName,
    event_id: payload.event_id ?? (eventName === "purchase" ? createPurchaseEventId(payload.transaction_id) : createEventId()),
    timestamp: eventTime,
    page_location: payload.page_location ?? getPageLocation(),
    page_title: payload.page_title ?? getPageTitle(),
    user_id: payload.user_id ?? getUserId(),
    session_id: payload.session_id ?? getSessionId(),
    event_name: eventName,
    event_time: eventTime,
    action_source: payload.action_source ?? TRACKING_ACTION_SOURCE,
    event_source_url: payload.event_source_url ?? getPageLocation(),
    client_user_agent: payload.client_user_agent ?? getClientUserAgent(),
    fbp: payload.fbp ?? getFbp(),
    fbc: payload.fbc ?? getFbc(),
    user_data: payload.user_data ?? {},
    custom_data: payload.custom_data ?? {},
    ecommerce: {
      currency,
      value,
      shipping: payload.shipping ?? TRACKING_DEFAULT_SHIPPING,
      tax: payload.tax ?? TRACKING_DEFAULT_TAX,
      coupon: payload.coupon ?? null,
      transaction_id: payload.transaction_id ?? null,
      items,
    },
    currency,
    value,
    transaction_id: payload.transaction_id ?? null,
    items,
    content_ids: contentIds,
    contents,
    content_type: payload.content_type ?? (items.length > 0 ? "product" : "product_group"),
    num_items: numItems,
    shipping_tier: payload.shipping_tier,
    payment_type: payload.payment_type,
  };

  const dataLayer = window.dataLayer;
  if (!dataLayer) return event;

  dataLayer.push({ ecommerce: null });
  dataLayer.push(event);

  logTrackingEvent(eventName, event);
  dispatchMetaCapiEvent(eventName, event.event_id, {
    ...payload,
    event_source_url: event.event_source_url,
    currency,
    value,
    content_ids: contentIds,
    contents,
    content_type: event.content_type,
    num_items: numItems,
    transaction_id: event.transaction_id,
  }, payload.user_data ?? {});
  return event;
}
