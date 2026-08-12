import { META_GRAPH_API_VERSION } from "./config.ts";
import { hashEmail, hashPhone, hashIdentifier } from "./hash.ts";
import type { CapiRequestBody, HashedUserData, MetaEventPayload } from "./types.ts";
import { debugLog } from "./utils.ts";

export async function buildUserData(
  body: CapiRequestBody,
  clientIp: string | undefined,
  clientUserAgent: string | undefined,
): Promise<HashedUserData> {
  const userData: HashedUserData = {};
  const input = body.user_data ?? {};

  if (input.email) userData.em = [await hashEmail(input.email)];
  if (input.phone) userData.ph = [await hashPhone(input.phone)];
  if (input.first_name) userData.fn = [await hashIdentifier(input.first_name)];
  if (input.last_name) userData.ln = [await hashIdentifier(input.last_name)];
  if (input.city) userData.ct = [await hashIdentifier(input.city)];
  if (input.country) userData.country = [await hashIdentifier(input.country)];
  // fbp/fbc/ip/user-agent are identifiers, not raw PII — sent unhashed per Meta spec.
  if (input.fbp) userData.fbp = input.fbp;
  if (input.fbc) userData.fbc = input.fbc;
  if (clientIp) userData.client_ip_address = clientIp;
  if (clientUserAgent) userData.client_user_agent = clientUserAgent;

  return userData;
}

export function buildEventPayload(body: CapiRequestBody, userData: HashedUserData): MetaEventPayload {
  return {
    event_name: body.event_name,
    event_time: body.event_time ?? Math.floor(Date.now() / 1000),
    event_id: body.event_id,
    action_source: "website",
    event_source_url: body.event_source_url,
    user_data: userData,
    custom_data: body.custom_data,
  };
}

const REQUEST_TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 2;

async function postToMeta(url: string, requestBody: Record<string, unknown>): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendMetaEvent(
  pixelId: string,
  accessToken: string,
  payload: MetaEventPayload,
  testEventCode?: string | null,
): Promise<{ ok: boolean; status: number }> {
  const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${pixelId}/events`;

  const requestBody: Record<string, unknown> = {
    data: [payload],
    access_token: accessToken,
  };
  if (testEventCode) requestBody.test_event_code = testEventCode;

  let lastStatus = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await postToMeta(url, requestBody);
      lastStatus = response.status;

      if (response.ok) return { ok: true, status: response.status };

      // Only retry on transient server-side failures, never on 4xx (bad request/auth).
      if (response.status < 500 || attempt === MAX_ATTEMPTS) {
        const text = await response.text().catch(() => "");
        debugLog("Meta API error response", { status: response.status, body: text.slice(0, 500), attempt });
        return { ok: false, status: response.status };
      }
    } catch (err) {
      lastStatus = 0;
      debugLog("Meta API request failed", { attempt, aborted: err instanceof DOMException && err.name === "AbortError" });
      if (attempt === MAX_ATTEMPTS) return { ok: false, status: 0 };
    }
  }

  return { ok: false, status: lastStatus };
}
