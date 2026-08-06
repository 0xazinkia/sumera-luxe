import { CORS_HEADERS, IS_DEBUG } from "./config.ts";

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

export function getClientIp(req: Request): string | undefined {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim();
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ?? undefined;
}

// Debug-only logging. Never pass access tokens or full user_data through this.
export function debugLog(message: string, details?: Record<string, unknown>) {
  if (!IS_DEBUG) return;
  console.log(`[meta-capi] ${message}`, details ?? {});
}

export function safeErrorLog(message: string, error: unknown) {
  const description = error instanceof Error ? error.message : String(error);
  console.error(`[meta-capi] ${message}: ${description}`);
}
