import type { TramusRequest, TramusResult } from "@tramus/protocol";
import { isExtensionInstalled } from "@/lib/extension";
import { sendViaExtension } from "@/lib/extension/client";
import type { EndpointDraft } from "../store/tab.store.types";

function toTramusRequest(draft: EndpointDraft): TramusRequest {
  const headers: [string, string][] = [];

  for (const h of draft.headers) {
    if (h.enabled && h.key.trim() !== "") {
      headers.push([h.key.trim(), h.value]);
    }
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
): Promise<TramusResult> {
  const status = await isExtensionInstalled(500);

  if (status.installed) {
    return sendViaExtension(request);
  }

  const start = performance.now();
  try {
    const url = new URL(request.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return {
        error: { code: "NETWORK", message: "Only http(s) URLs are supported" },
        ok: false,
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
    });

    const buffer = await res.arrayBuffer();
    const charset =
      /charset=["']?([^;"'\s]+)/i.exec(
        res.headers.get("content-type") ?? "",
      )?.[1] ?? "utf-8";
    let body: string;
    try {
      body = new TextDecoder(charset).decode(buffer);
    } catch {
      body = new TextDecoder("utf-8").decode(buffer);
    }

    return {
      ok: true,
      response: {
        body,
        headers: [...res.headers.entries()],
        sizeBytes: buffer.byteLength,
        status: res.status,
        statusText: res.statusText,
        timeMs: Math.round(performance.now() - start),
      },
    };
  } catch (e) {
    return {
      error: {
        code: "NETWORK",
        message: e instanceof Error ? e.message : "Request failed",
      },
      ok: false,
    };
  }
}

export { toTramusRequest };
