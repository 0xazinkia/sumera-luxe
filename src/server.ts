import "./lib/error-capture";

import { promises as fs } from "node:fs";
import path from "node:path";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

function getCacheControlHeader(pathname: string, contentType: string): string | null {
  const ext = path.extname(pathname).toLowerCase();
  if (pathname === "/sitemap.xml") {
    return "public, max-age=3600, stale-while-revalidate=86400";
  }

  if ([".js", ".mjs", ".cjs", ".css", ".json"].includes(ext)) {
    return "public, max-age=31536000, immutable";
  }

  if ([".png", ".jpg", ".jpeg", ".webp", ".avif", ".svg"].includes(ext)) {
    return "public, max-age=31536000, immutable";
  }

  if ([".woff2", ".woff", ".ttf", ".otf", ".eot"].includes(ext)) {
    return "public, max-age=31536000, immutable";
  }

  if ([".ico", ".txt"].includes(ext)) {
    return "public, max-age=604800, stale-while-revalidate=604800";
  }

  if (contentType.startsWith("image/") && ext === "") {
    return "public, max-age=31536000, immutable";
  }

  return null;
}

function sanitizePathSegment(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "item";
}

async function handleLocalUpload(request: Request) {
  const url = new URL(request.url);
  if (url.pathname !== "/api/upload-image" || request.method !== "POST") {
    return null;
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: "No file provided" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const folder = sanitizePathSegment(String(formData.get("folder") ?? "uploads"));
  const prefix = sanitizePathSegment(String(formData.get("prefix") ?? "image"));
  const originalName = typeof file.name === "string" ? file.name : "file";
  const extension = path.extname(originalName) || ".bin";
  const fileName = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`;
  const uploadDir = path.resolve(process.cwd(), "public", "uploads", folder);
  await fs.mkdir(uploadDir, { recursive: true });

  const filePath = path.join(uploadDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  const publicUrl = `/uploads/${folder}/${fileName}`;
  return Response.json({ url: publicUrl, path: publicUrl });
}

async function handleLocalDelete(request: Request) {
  const url = new URL(request.url);
  if (url.pathname !== "/api/delete-upload" || request.method !== "POST") {
    return null;
  }

  const body = await request.json().catch(() => null);
  const urls = Array.isArray(body?.urls)
    ? body.urls
    : body?.url
    ? [body.url]
    : [];

  if (!urls.length) {
    return new Response(JSON.stringify({ error: "No urls provided" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const uploadRoot = path.resolve(process.cwd(), "public", "uploads");
  const results = { deleted: [] as string[], errors: [] as { url: string; message: string }[] };

  for (const uploadUrl of urls) {
    try {
      const pathname = new URL(uploadUrl, "http://example.com").pathname;
      const trimmedPath = pathname.replace(/^\/+/, "");
      if (!trimmedPath.startsWith("uploads/")) {
        continue;
      }

      const filePath = path.resolve(process.cwd(), "public", trimmedPath);
      if (!filePath.startsWith(uploadRoot + path.sep) && filePath !== uploadRoot) {
        results.errors.push({ url: uploadUrl, message: "Invalid local upload path" });
        continue;
      }

      await fs.unlink(filePath).catch((error: any) => {
        if (error?.code === "ENOENT") return;
        throw error;
      });
      results.deleted.push(uploadUrl);
    } catch (error: any) {
      results.errors.push({ url: uploadUrl, message: error?.message ?? "Delete failed" });
    }
  }

  return Response.json(results);
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const localUploadResponse = await handleLocalUpload(request);
      if (localUploadResponse) {
        return localUploadResponse;
      }

      const localDeleteResponse = await handleLocalDelete(request);
      if (localDeleteResponse) {
        return localDeleteResponse;
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalizedResponse = await normalizeCatastrophicSsrResponse(response);
      const cacheControl = getCacheControlHeader(new URL(request.url).pathname, normalizedResponse.headers.get("content-type") ?? "");
      if (cacheControl && !normalizedResponse.headers.has("cache-control")) {
        normalizedResponse.headers.set("cache-control", cacheControl);
      }
      return normalizedResponse;
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
