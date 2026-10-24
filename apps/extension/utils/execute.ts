import {
  classifyMime,
  mimeOf,
  type TramusRequest,
  type TramusResult,
} from "@tramus/protocol";

const MAX_RESPONSE_SIZE = 20 * 1024 * 1024; // 20 MB

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

export async function execute(
  req: TramusRequest,
  timeoutMs = 30000,
  externalSignal?: AbortSignal,
): Promise<TramusResult> {
  const start = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort("timeout"), timeoutMs);

  const abortHandler = () => controller.abort();
  externalSignal?.addEventListener("abort", abortHandler, { once: true });

  try {
    const url = new URL(req.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return {
        error: {
          code: "INVALID_REQUEST",
          message: "Only http(s) URLs are supported",
        },
        ok: false,
      };
    }

    let body: string | Uint8Array<ArrayBuffer> | undefined;
    const noBody = ["GET", "HEAD"].includes(req.method.toUpperCase());
    if (noBody) {
      body = undefined;
    } else if (req.bodyBase64 !== undefined) {
      body = base64ToBytes(req.bodyBase64);
    } else {
      body = req.body;
    }

    const res = await fetch(url, {
      body,
      cache: "no-store",
      credentials: "omit",
      headers: req.headers,
      method: req.method,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", abortHandler);

    const headers = [...res.headers.entries()];
    const kind = classifyMime(mimeOf(headers));
    const isBinary = kind === "image" || kind === "pdf" || kind === "binary";

    const { buffer, truncated } = await readBodyWithLimit(
      res.body,
      MAX_RESPONSE_SIZE,
    );

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
        truncated,
      },
    };
  } catch (e) {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", abortHandler);
    if (e instanceof DOMException && e.name === "AbortError") {
      if (externalSignal?.aborted) {
        return {
          error: { code: "ABORTED", message: "Request aborted" },
          ok: false,
        };
      }
      return {
        error: { code: "TIMEOUT", message: "Request timed out" },
        ok: false,
      };
    }
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

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

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
