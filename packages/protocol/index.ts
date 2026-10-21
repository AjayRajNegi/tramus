export type TramusRequest = {
  method: string;
  url: string;
  headers: [string, string][];
  body?: string;
};

export type TramusResponse = {
  status: number;
  statusText: string;
  headers: [string, string][];
  body: string;
  bodyBase64?: string;
  finalUrl: string;
  redirected: boolean;
  sizeBytes: number;
  timeMs: number;
};

export type BodyKind =
  | "json"
  | "xml"
  | "html"
  | "text"
  | "image"
  | "pdf"
  | "binary";

export function classifyMime(mime: string): BodyKind {
  if (mime.startsWith("image/") && !mime.includes("svg")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime.includes("json")) return "json";
  if (mime.includes("html")) return "html";
  if (mime.includes("xml")) return "xml";
  if (mime === "" || mime.startsWith("text/")) return "text";
  if (/javascript|x-www-form-urlencoded|graphql/.test(mime)) return "text";
  return "binary";
}

export function mimeOf(headers: [string, string][]): string {
  const ct = headers.find(([k]) => k.toLowerCase() === "content-type")?.[1];
  return ct?.split(";")[0]?.trim().toLowerCase() ?? "";
}

export type TramusError = { code: ErrorCode; message: string };

export type ErrorCode =
  | "INVALID_REQUEST"
  | "NETWORK"
  | "TIMEOUT"
  | "EXTENSION_ERROR"
  | "ABORTED";

export type TramusResult =
  | { ok: true; response: TramusResponse }
  | { ok: false; error: TramusError };

// web -> content script
export type WebRequest = {
  source: typeof BRIDGE_SOURCE_WEB;
  type: "request";
  id: string; // correlates the response with the request
  request: TramusRequest;
};
export type WebAbort = {
  source: typeof BRIDGE_SOURCE_WEB;
  type: "abort";
  id: string;
};
export type WebToExt = WebPing | WebRequest | WebAbort;

// content script -> web
export type ExtResponse = {
  source: typeof BRIDGE_SOURCE_EXT;
  type: "response";
  id: string;
  result: TramusResult;
};
export type ExtToWeb = ExtPong | ExtResponse;

// content script <-> background
export type BackgroundRequest = { type: "request"; request: TramusRequest };
export type BackgroundResponse = { type: "response"; result: TramusResult };
export type BackgroundAbort = { type: "abort"; id: string };

export const BRIDGE_SOURCE_WEB = "tramus-web" as const;

export const BRIDGE_SOURCE_EXT = "tramus-ext" as const;

export type WebPing = {
  source: typeof BRIDGE_SOURCE_WEB;
  type: "ping";
};

export type ExtPong = {
  source: typeof BRIDGE_SOURCE_EXT;
  type: "pong";
  version: string;
};

export type BackgroundPing = { type: "ping" };
export type BackgroundPong = { type: "pong"; version: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isHeaderPairs(v: unknown): v is [string, string][] {
  return (
    Array.isArray(v) &&
    v.every(
      (p) =>
        Array.isArray(p) &&
        p.length === 2 &&
        typeof p[0] === "string" &&
        typeof p[1] === "string",
    )
  );
}

export function isTramusRequest(v: unknown): v is TramusRequest {
  return (
    isRecord(v) &&
    typeof v.method === "string" &&
    typeof v.url === "string" &&
    isHeaderPairs(v.headers) &&
    (v.body === undefined || typeof v.body === "string")
  );
}

export function isTramusResult(v: unknown): v is TramusResult {
  return isRecord(v) && typeof v.ok === "boolean";
}

export function isBackgroundRequest(v: unknown): v is BackgroundRequest {
  return isRecord(v) && v.type === "request" && isTramusRequest(v.request);
}

export function isBackgroundAbort(v: unknown): v is BackgroundAbort {
  return isRecord(v) && v.type === "abort" && typeof v.id === "string";
}

export function isBackgroundResponse(v: unknown): v is BackgroundResponse {
  return isRecord(v) && v.type === "response" && isTramusResult(v.result);
}

export function isWebToExt(value: unknown): value is WebToExt {
  if (!isRecord(value) || value.source !== BRIDGE_SOURCE_WEB) return false;
  if (value.type === "ping") return true;
  if (value.type === "abort") return typeof value.id === "string";
  return (
    value.type === "request" &&
    typeof value.id === "string" &&
    isTramusRequest(value.request)
  );
}

export function isExtToWeb(value: unknown): value is ExtToWeb {
  if (!isRecord(value) || value.source !== BRIDGE_SOURCE_EXT) return false;
  if (value.type === "pong") return typeof value.version === "string";
  return (
    value.type === "response" &&
    typeof value.id === "string" &&
    isTramusResult(value.result)
  );
}

export function isBackgroundPing(value: unknown): value is BackgroundPing {
  return isRecord(value) && value.type === "ping";
}

export function isBackgroundPong(value: unknown): value is BackgroundPong {
  return (
    isRecord(value) &&
    value.type === "pong" &&
    typeof value.version === "string"
  );
}
