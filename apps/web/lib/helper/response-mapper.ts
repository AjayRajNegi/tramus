import type { TramusRequest, TramusResponse } from "@tramus/protocol";

type Headers = [string, string][];
const encoder = new TextEncoder();

function getHeader(headers: Headers, name: string): string | undefined {
  const n = name.toLowerCase();
  return headers.find(([k]) => k.toLowerCase() === n)?.[1];
}

function getMimeType(headers: Headers): string {
  return (
    getHeader(headers, "content-type")?.split(";")[0]?.trim().toLowerCase() ??
    ""
  );
}

function detectBody(text: string, mimeType: string) {
  if (mimeType.includes("json")) {
    try {
      JSON.parse(text);
      return { kind: "json" as const, parseError: "none" };
    } catch (e) {
      return {
        kind: "json" as const,
        parseError: e instanceof Error ? e.message : "Invalid JSON",
      };
    }
  }
  if (mimeType.includes("html"))
    return { kind: "html" as const, parseError: "none" };
  if (mimeType.includes("xml"))
    return { kind: "xml" as const, parseError: "none" };
  return { kind: "text" as const, parseError: "none" };
}

function headersByteSize(headers: Headers): number {
  return headers.reduce(
    (n, [k, v]) => n + encoder.encode(`${k}: ${v}\r\n`).length,
    0,
  );
}

function parseSetCookies(headers: Headers) {
  return headers
    .filter(([k]) => k.toLowerCase() === "set-cookie")
    .map(([, raw]) => {
      const pair = raw.split(";")[0]?.trim() ?? "";
      const eq = pair.indexOf("=");
      return {
        name: eq === -1 ? pair : pair.slice(0, eq),
        raw,
        value: eq === -1 ? "" : pair.slice(eq + 1),
      };
    });
}

export function toResponseState(
  id: string,
  request: TramusRequest,
  res: TramusResponse,
  startedAt: number,
  receivedAt: number,
) {
  const mimeType = getMimeType(res.headers);
  const { kind, parseError } = detectBody(res.body, mimeType);
  const headersSize = headersByteSize(res.headers);

  return {
    body: {
      kind,
      mimeType,
      parseError,
      size: res.sizeBytes,
      text: res.body,
      truncated: false,
    },
    cookies: parseSetCookies(res.headers),
    headers: res.headers,
    httpVersion: "unknown",
    id,
    ok: res.status >= 200 && res.status < 300,
    receivedAt,
    redirectChain: undefined,
    redirected: false,
    size: {
      body: res.sizeBytes,
      headers: headersSize,
      total: res.sizeBytes + headersSize,
    },
    status: res.status,
    statusText: res.statusText,
    timing: {
      startedAt,
      total: res.timeMs,
    },
    url: request.url,
  };
}
