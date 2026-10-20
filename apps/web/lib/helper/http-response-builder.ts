import {
  classifyMime,
  mimeOf,
  type TramusRequest,
  type TramusResponse,
} from "@tramus/protocol";
import type {
  HttpResponse,
  ResponseBody,
  ResponseCookie,
  ResponseHeader,
} from "../store/response.store.types";

const MAX_TEXT_CHARS = 5_000_000;
const encoder = new TextEncoder();

function parseSetCookie(raw: string): ResponseCookie | null {
  const [pair = "", ...attrs] = raw.split(";").map((s) => s.trim());
  const eq = pair.indexOf("=");
  if (eq <= 0) return null;

  const cookie: ResponseCookie = {
    httpOnly: false,
    name: pair.slice(0, eq),
    secure: false,
    value: pair.slice(eq + 1),
  };

  for (const attr of attrs) {
    const i = attr.indexOf("=");
    const key = (i === -1 ? attr : attr.slice(0, i)).toLowerCase();
    const val = i === -1 ? "" : attr.slice(i + 1);

    switch (key) {
      case "domain":
        cookie.domain = val;
        break;
      case "path":
        cookie.path = val;
        break;
      case "expires": {
        const d = new Date(val);
        if (!Number.isNaN(d.getTime())) cookie.expires = d.toISOString();
        break;
      }
      case "max-age": {
        const n = Number(val);
        if (Number.isFinite(n)) cookie.maxAge = n;
        break;
      }
      case "httponly":
        cookie.httpOnly = true;
        break;
      case "secure":
        cookie.secure = true;
        break;
      case "samesite": {
        const s = val.toLowerCase();
        if (s === "strict") cookie.sameSite = "Strict";
        else if (s === "lax") cookie.sameSite = "Lax";
        else if (s === "none") cookie.sameSite = "None";
        break;
      }
    }
  }
  return cookie;
}

function buildBody(res: TramusResponse, mimeType: string): ResponseBody {
  const base = { mimeType, size: res.sizeBytes, truncated: false };

  if (res.sizeBytes === 0) return { ...base, kind: "empty" };

  const kind = classifyMime(mimeType);

  if (kind === "image" || kind === "pdf" || kind === "binary") {
    if (res.bodyBase64 !== undefined) {
      const bytes = Uint8Array.from(atob(res.bodyBase64), (c) =>
        c.charCodeAt(0),
      );
      const blob = new Blob([bytes], { type: mimeType });
      return { ...base, kind, objectUrl: URL.createObjectURL(blob) };
    }
    return {
      ...base,
      kind: "text",
      parseError: "Binary content can't be displayed",
      text: "",
    };
  }

  const truncated = res.body.length > MAX_TEXT_CHARS;
  const text = truncated ? res.body.slice(0, MAX_TEXT_CHARS) : res.body;
  const textBase = { ...base, text, truncated };

  if (kind === "json" && !truncated) {
    try {
      JSON.parse(text);
    } catch (e) {
      return {
        ...textBase,
        kind,
        parseError: e instanceof Error ? e.message : "Invalid JSON",
      };
    }
  }
  return { ...textBase, kind };
}

export function httpResponseBuilder(
  id: string,
  request: TramusRequest,
  res: TramusResponse,
  startedAt: number,
  receivedAt: number,
): HttpResponse {
  const headers: ResponseHeader[] = res.headers.map(([key, value]) => ({
    key,
    value,
  }));

  const cookies = res.headers
    .filter(([k]) => k.toLowerCase() === "set-cookie")
    .map(([, raw]) => parseSetCookie(raw))
    .filter((c): c is ResponseCookie => c !== null);

  const headersSize = res.headers.reduce(
    (n, [k, v]) => n + encoder.encode(`${k}: ${v}\r\n`).length,
    0,
  );

  return {
    body: buildBody(res, mimeOf(res.headers)),
    cookies,
    headers,
    id,
    ok: res.status >= 200 && res.status < 300,
    receivedAt,
    redirected: res.redirected,
    size: {
      body: res.sizeBytes,
      headers: headersSize,
      total: res.sizeBytes + headersSize,
    },
    status: res.status,
    statusText: res.statusText,
    timing: { startedAt, total: res.timeMs },
    url: res.finalUrl || request.url,
  };
}
