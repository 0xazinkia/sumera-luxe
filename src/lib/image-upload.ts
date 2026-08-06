function sanitizePathSegment(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "item";
}

function getFileExtension(fileName: string) {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot > -1 ? fileName.slice(lastDot) : "";
}

function compressImageToWebp(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const maxDimension = 1600;
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Unable to create canvas context"));
        return;
      }

      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          try {
            if (!blob) {
              reject(new Error("Unable to encode image as WebP"));
              return;
            }

            resolve(blob);
          } finally {
            URL.revokeObjectURL(objectUrl);
          }
        },
        "image/webp",
        0.95,
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read image"));
    };

    image.src = objectUrl;
  });
}

export async function uploadFile(file: File, options: { folder: string; prefix?: string }) {
  const folder = sanitizePathSegment(options.folder);
  const prefix = sanitizePathSegment(options.prefix ?? "file");
  const extension = getFileExtension(file.name || "");
  const safeName = `${prefix}${extension || ".bin"}`;

  const formData = new FormData();
  formData.append("file", file, safeName);
  formData.append("folder", folder);
  formData.append("prefix", prefix);

  const response = await fetch("/api/upload-image", {
    method: "POST",
    body: formData,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.url) {
    throw new Error(payload?.error ?? "Upload failed");
  }

  return { url: payload.url as string, path: payload.path as string };
}

export async function uploadOptimizedImage(file: File, options: { folder: string; prefix?: string }) {
  const blob = await compressImageToWebp(file);
  const optimizedFile = new File([blob], `${sanitizePathSegment(options.prefix ?? "image")}.webp`, { type: "image/webp" });
  return uploadFile(optimizedFile, options);
}

export function isLocalUploadUrl(url?: string | null): url is string {
  return typeof url === "string" && url.startsWith("/uploads/");
}

export async function deleteLocalUpload(url: string) {
  return deleteLocalUploads([url]);
}

export async function deleteLocalUploads(urls: string[]) {
  if (!urls.length) {
    return { deleted: [] as string[], errors: [] as { url: string; message: string }[] };
  }

  const response = await fetch("/api/delete-upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ urls }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error ?? "Failed to delete local uploads");
  }

  return payload as { deleted: string[]; errors: { url: string; message: string }[] };
}
