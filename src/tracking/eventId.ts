export function createEventId(prefix = "evt") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function createPurchaseEventId(transactionId?: string | null) {
  const normalized = transactionId?.trim();
  return normalized ? normalized : createEventId("purchase");
}
