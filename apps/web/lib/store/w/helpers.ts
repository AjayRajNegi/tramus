import { current, isDraft } from "immer";
import type { ResponseBody, ResponseState } from "./response.store.types";
import type { EndpointDraft, KeyValue } from "./tab.store.types";
import type { NodeOutcome } from "./types";

/** structuredClone that also works on immer drafts (proxies can't be cloned). */
export const clone = <T>(value: T): T =>
  structuredClone(isDraft(value) ? (current(value as never) as T) : value);

export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  const ra = a as Record<string, unknown>;
  const rb = b as Record<string, unknown>;
  for (const key of new Set([...Object.keys(ra), ...Object.keys(rb)])) {
    if (!deepEqual(ra[key], rb[key])) return false;
  }
  return true;
}

/* ------------------------------- drafts ----------------------------------- */

export const buildUrl = (url: string, params: KeyValue[]): string => {
  const [withoutHash = "", hash = ""] = url.split("#");
  const [base = ""] = withoutHash.split("?");

  const query = params
    .filter((p) => p.enabled && p.key.trim() !== "")
    .map(
      (p) =>
        `${encodeURIComponent(p.key.trim())}=${encodeURIComponent(p.value)}`,
    )
    .join("&");

  return `${base}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
};

export const normalizeDraft = (draft: EndpointDraft): EndpointDraft => {
  const copy = clone(draft);
  copy.url = buildUrl(copy.url, copy.params);
  return copy;
};

export function stripFileContents(draft: EndpointDraft): EndpointDraft {
  const copy = clone(draft);
  if (copy.body.file) copy.body.file.base64 = "";
  for (const row of copy.body.formData) {
    for (const f of row.files) f.base64 = "";
  }
  return copy;
}

export const defaultEndpointName = (d: EndpointDraft) =>
  `${d.method} ${d.path || d.url}`;

export function makeDraft(
  method: EndpointDraft["method"],
  path: string,
  json = "",
): EndpointDraft {
  return {
    authorization: { password: "", token: "", type: "none", username: "" },
    body: {
      file: null,
      form: [],
      formData: [],
      json,
      raw: "",
      type: json ? "json" : "none",
    },
    headers: [],
    method,
    params: [],
    path,
    url: path,
  };
}

/* ------------------------------ responses --------------------------------- */

export const revokeBody = (body: ResponseBody) => {
  if ("objectUrl" in body) URL.revokeObjectURL(body.objectUrl);
};

export const revokeResponseUrl = (state: ResponseState | undefined) => {
  if (state?.phase === "success") revokeBody(state.response.body);
};

export function outcomeFromStatus(
  status: number,
  durationMs: number,
): NodeOutcome {
  return status < 400
    ? { durationMs, state: "success", status }
    : { durationMs, state: "failure", status };
}
