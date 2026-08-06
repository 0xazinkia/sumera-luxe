import { pushDataLayer } from "./dataLayer";
import type { TrackingEventName, TrackingEventPayload } from "./types";

const BEGIN_CHECKOUT_INTENT_STORAGE_KEY = "sumera_tracking_begin_checkout_intent";

type BeginCheckoutIntentState = {
  journeyId: string;
  fired: boolean;
};

function getBeginCheckoutIntentState(): BeginCheckoutIntentState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(BEGIN_CHECKOUT_INTENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BeginCheckoutIntentState;
    return parsed && typeof parsed.journeyId === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function setBeginCheckoutIntentState(state: BeginCheckoutIntentState | null) {
  if (typeof window === "undefined") return;

  try {
    if (!state) {
      window.sessionStorage.removeItem(BEGIN_CHECKOUT_INTENT_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(BEGIN_CHECKOUT_INTENT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors and fall back to a non-persistent guard
  }
}

export function requestBeginCheckoutIntent() {
  if (typeof window === "undefined") return false;

  const existing = getBeginCheckoutIntentState();
  if (existing && !existing.fired) return false;

  setBeginCheckoutIntentState({ journeyId: `${Date.now()}-${Math.random().toString(16).slice(2)}`, fired: false });
  return true;
}

export function consumePendingBeginCheckoutIntent(payload: TrackingEventPayload = {}) {
  if (typeof window === "undefined") return false;

  const existing = getBeginCheckoutIntentState();
  if (!existing || existing.fired) return false;

  setBeginCheckoutIntentState({ ...existing, fired: true });
  return trackBeginCheckout(payload);
}

export function trackEvent(eventName: TrackingEventName, payload: TrackingEventPayload = {}) {
  return pushDataLayer(eventName, payload);
}

export function trackPageView(payload: TrackingEventPayload = {}) {
  return trackEvent("page_view", payload);
}

export function trackViewItem(payload: TrackingEventPayload = {}) {
  return trackEvent("view_item", payload);
}

export function trackAddToCart(payload: TrackingEventPayload = {}) {
  return trackEvent("add_to_cart", payload);
}

export function trackBeginCheckout(payload: TrackingEventPayload = {}) {
  return trackEvent("begin_checkout", payload);
}

export function trackAddShippingInfo(payload: TrackingEventPayload = {}) {
  return trackEvent("add_shipping_info", payload);
}

export function trackPurchase(payload: TrackingEventPayload = {}) {
  return trackEvent("purchase", payload);
}
