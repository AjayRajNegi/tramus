import {
  classifyMime,
  mimeOf,
  type TramusRequest,
  type TramusResult,
} from "@tramus/protocol";

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

export async function execute(req: TramusRequest): Promise<TramusResult> {
  const start = performance.now();
  try {
    const url = new URL(req.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return {
        error: { code: "NETWORK", message: "Only http(s) URLs are supported" },
        ok: false,
      };
    }

    const hasBody =
      req.body !== undefined &&
      !["GET", "HEAD"].includes(req.method.toUpperCase());
    const res = await fetch(url, {
      body: hasBody ? req.body : undefined,
      cache: "no-store",
      credentials: "omit",
      headers: req.headers,
      method: req.method,
    });

    const buffer = await res.arrayBuffer();
    const headers = [...res.headers.entries()];
    const kind = classifyMime(mimeOf(headers));
    const isBinary = kind === "image" || kind === "pdf" || kind === "binary";

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

function bytesToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}
