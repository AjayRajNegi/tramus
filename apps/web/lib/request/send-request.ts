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

function toTramusRequest(draft: EndpointDraft): TramusRequest {
  let headers: [string, string][] = [];

  for (const h of draft.headers) {
    if (h.enabled && h.key.trim() !== "") {
      headers.push([h.key.trim(), h.value]);
    }
  }

  // Add Authorization header from auth config (overrides any user-defined Authorization header)
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

  // GET and HEAD never carry a body
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
    const buffer = await res.arrayBuffer();
    const headers = [...res.headers.entries()];
    const kind = classifyMime(mimeOf(headers));
    const isBinary = kind === "image" || kind === "pdf" || kind === "binary";
    const charset =
      /charset=["']?([^;"'\s]+)/i.exec(
        res.headers.get("content-type") ?? "",
      )?.[1] ?? "utf-8";

    let _body: string;
    try {
      _body = new TextDecoder(charset).decode(buffer);
    } catch {
      _body = new TextDecoder("utf-8").decode(buffer);
    }

    return {
      ok: true,
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
      },
      requestId,
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
