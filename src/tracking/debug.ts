const isDevelopment = typeof window !== "undefined" && window.location.hostname === "localhost";

export function logTrackingEvent(eventName: string, payload: Record<string, unknown>) {
  if (!isDevelopment) return;

  console.groupCollapsed(`[tracking] ${eventName}`);
  console.info(payload);
  console.groupEnd();
}
