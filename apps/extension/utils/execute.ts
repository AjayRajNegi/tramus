import type { TramusRequest, TramusResult } from "@tramus/protocol";

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
    return {
      ok: true,
      response: {
        body: decodeBody(buffer, res.headers.get("content-type")),
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
