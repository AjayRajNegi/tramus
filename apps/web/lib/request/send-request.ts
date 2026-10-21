import {
  classifyMime,
  mimeOf,
  type TramusRequest,
  type TramusResult,
} from "@tramus/protocol";
import { buildAuthorizationHeader } from "@/components/layout/editor-shell/auth-editor";
import { isExtensionInstalled } from "@/lib/extension";
import { sendViaExtension } from "@/lib/extension/client";
import type { EndpointDraft } from "@/lib/store/tab.store.types";

const MAX_RESPONSE_SIZE = 20 * 1024 * 1024; // 20 MB

export function decodeBody(
  bytes: ArrayBuffer,
  contentType: string | null,
): string {
  const charset =
    /charset=["']?([^;"'\s]+)/i.exec(contentType ?? "")?.[1] ?? "utf-8";
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

async function readBodyWithLimit(
  body: ReadableStream<Uint8Array> | null,
  limit: number,
): Promise<{ buffer: ArrayBuffer; truncated: boolean }> {
  if (!body) {
    return { buffer: new ArrayBuffer(0), truncated: false };
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let totalSize = 0;
  let truncated = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        totalSize += value.length;
        if (totalSize > limit) {
          truncated = true;
          const remaining = limit - (totalSize - value.length);
          if (remaining > 0) {
            chunks.push(value.subarray(0, remaining));
          }
          break;
        }
        chunks.push(value);
      }
    }
  } finally {
    reader.releaseLock();
  }

  const combined = new Uint8Array(totalSize > limit ? limit : totalSize);
  let offset = 0;
  for (const chunk of chunks) {
    const toCopy = Math.min(chunk.length, combined.length - offset);
    combined.set(chunk.subarray(0, toCopy), offset);
    offset += toCopy;
  }

  return { buffer: combined.buffer, truncated };
}

function toTramusRequest(draft: EndpointDraft): TramusRequest {
  let headers: [string, string][] = [];

  for (const h of draft.headers) {
    if (h.enabled && h.key.trim() !== "") {
      headers.push([h.key.trim(), h.value]);
    }
  }

  const authHeader = buildAuthorizationHeader(draft.authorization);
  if (authHeader) {
    headers = headers.filter(([k]) => k.toLowerCase() !== "authorization");
    headers.push(["Authorization", authHeader]);
  }

  let body: string | undefined;
  if (draft.body.type === "json" && draft.body.json.trim()) {
    body = draft.body.json;
    if (!headers.some(([k]) => k.toLowerCase() === "content-type")) {
      headers.push(["Content-Type", "application/json"]);
    }
  } else if (draft.body.type === "raw" && draft.body.raw.trim()) {
    body = draft.body.raw;
  } else if (draft.body.type === "form") {
    const formData = new URLSearchParams();
    for (const f of draft.body.form) {
      if (f.enabled && f.key.trim() !== "") {
        formData.append(f.key.trim(), f.value);
      }
    }
    body = formData.toString() || undefined;
    if (body && !headers.some(([k]) => k.toLowerCase() === "content-type")) {
      headers.push(["Content-Type", "application/x-www-form-urlencoded"]);
    }
  }

  if (["GET", "HEAD"].includes(draft.method.toUpperCase())) {
    body = undefined;
  }

  const url = new URL(draft.url);
  for (const p of draft.params) {
    if (p.enabled && p.key.trim() !== "") {
      url.searchParams.append(p.key.trim(), p.value);
    }
  }

  return {
    body,
    headers,
    method: draft.method,
    url: url.toString(),
  };
}

export async function sendRequest(
  request: TramusRequest,
  timeoutMs = 30000,
): Promise<TramusResult & { requestId: string }> {
  const requestId = request.id ?? crypto.randomUUID();
  const requestWithId = { ...request, id: requestId };

  const status = await isExtensionInstalled(500);

  if (status.installed) {
    const result = await sendViaExtension(requestWithId, timeoutMs);
    return { ...result, requestId };
  }

  const start = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort("timeout"), timeoutMs);

  try {
    const url = new URL(request.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return {
        error: {
          code: "INVALID_REQUEST",
          message: "Only http(s) URLs are supported",
        },
        ok: false,
        requestId,
      };
    }

    const hasBody =
      request.body !== undefined &&
      !["GET", "HEAD"].includes(request.method.toUpperCase());

    const res = await fetch(url, {
      body: hasBody ? request.body : undefined,
      cache: "no-store",
      credentials: "omit",
      headers: request.headers,
      method: request.method,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const headers = [...res.headers.entries()];
    const kind = classifyMime(mimeOf(headers));
    const isBinary = kind === "image" || kind === "pdf" || kind === "binary";

    // Read body incrementally with size limit
    const { buffer, truncated } = await readBodyWithLimit(
      res.body,
      MAX_RESPONSE_SIZE,
    );

    return {
      ok: true,
      requestId,
      response: {
        body: isBinary
          ? ""
          : decodeBody(buffer, res.headers.get("content-type")),
        bodyBase64: isBinary ? bytesToBase64(buffer) : undefined,
        finalUrl: res.url,
        headers,
        redirected: res.redirected,
        sizeBytes: buffer.byteLength,
        status: res.status,
        statusText: res.statusText,
        timeMs: Math.round(performance.now() - start),
        truncated,
      },
    };
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof DOMException && e.name === "AbortError") {
      return {
        error: { code: "TIMEOUT", message: "Request timed out" },
        ok: false,
        requestId,
      };
    }
    return {
      error: {
        code: "NETWORK",
        message: e instanceof Error ? e.message : "Request failed",
      },
      ok: false,
      requestId,
    };
  }
}

function bytesToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

export { toTramusRequest };
