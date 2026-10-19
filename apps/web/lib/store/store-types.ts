export type ResponseHeader = {
  key: string;
  value: string;
};

export type StatusCategory =
  | "informational" // 1xx
  | "success" // 2xx
  | "redirect" // 3xx
  | "client_error" // 4xx
  | "server_error"; // 5xx

export const getStatusCategory = (status: number): StatusCategory => {
  if (status >= 500) return "server_error";
  if (status >= 400) return "client_error";
  if (status >= 300) return "redirect";
  if (status >= 200) return "success";
  return "informational";
};

export type RequestSnapshot = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  headers: ResponseHeader[];
  bodyPreview?: string;
  sentAt: number;
};

export type ResponseBodyKind =
  | "empty"
  | "json"
  | "xml"
  | "html"
  | "text"
  | "image"
  | "pdf"
  | "binary";

type ResponseBodyBase = {
  mimeType: string | null;
  charset?: string;
  size: number;
  truncated: boolean;
};

export type ResponseBody =
  | (ResponseBodyBase & { kind: "empty" })
  | (ResponseBodyBase & {
      kind: "json" | "xml" | "html" | "text";
      text: string;
      parseError?: string;
    })
  | (ResponseBodyBase & {
      kind: "image" | "pdf" | "binary";
      /** URL.createObjectURL(blob). Must be revoked when the response is cleared. */
      objectUrl: string;
    });

export type ResponseCookie = {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  /** ISO date string or undefined for session cookies. */
  expires?: string;
  maxAge?: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: "Strict" | "Lax" | "None";
};

export type ResponseSize = {
  headers: number;
  body: number;
  total: number;
};

export type ResponseTiming = {
  startedAt: number;
  total: number;
  dns?: number;
  connect?: number;
  tls?: number;
  ttfb?: number;
  download?: number;
};

export type RedirectHop = {
  url: string;
  status: number;
};

export type HttpResponse = {
  id: string;
  request: RequestSnapshot;

  status: number;
  statusText: string;
  ok: boolean;
  httpVersion?: "HTTP/1.0" | "HTTP/1.1" | "HTTP/2" | "HTTP/3";

  url: string;
  redirected: boolean;
  redirectChain?: RedirectHop[];

  headers: ResponseHeader[];
  cookies: ResponseCookie[];
  body: ResponseBody;

  size: ResponseSize;
  timing: ResponseTiming;
  receivedAt: number;
};

export type RequestErrorCode =
  | "invalid_url"
  | "dns"
  | "network"
  | "tls"
  | "cors"
  | "timeout"
  | "aborted"
  | "body_too_large"
  | "unknown";

export type RequestFailure = {
  id: string;
  request: RequestSnapshot;
  code: RequestErrorCode;
  message: string;
  duration: number;
  occurredAt: number;
};

export type ResponseState =
  | { phase: "idle" }
  | { phase: "loading"; requestId: string; startedAt: number }
  | { phase: "success"; response: HttpResponse }
  | { phase: "error"; failure: RequestFailure };
