import {
  BRIDGE_SOURCE_WEB,
  isExtToWeb,
  type TramusRequest,
  type TramusResult,
} from "@tramus/protocol";

type PendingEntry = {
  resolve: (result: TramusResult) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

const pending = new Map<string, PendingEntry>();

let listenerAttached = false;

function ensureListener() {
  if (listenerAttached) return;
  listenerAttached = true;

  if (typeof window === "undefined") return;

  window.addEventListener("message", (event: MessageEvent) => {
    if (event.source !== window || event.origin !== window.location.origin)
      return;
    if (!isExtToWeb(event.data)) return;
    if (event.data.type !== "response") return;

    const entry = pending.get(event.data.id);
    if (entry) {
      clearTimeout(entry.timeoutId);
      pending.delete(event.data.id);
      entry.resolve(event.data.result);
    }
  });
}

export function sendViaExtension(
  request: TramusRequest,
  timeoutMs = 30000,
): Promise<TramusResult> {
  ensureListener();
  const id = crypto.randomUUID();

  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      const entry = pending.get(id);
      if (entry) {
        pending.delete(id);
        resolve({
          error: { code: "TIMEOUT", message: "Request timed out" },
          ok: false,
        });
      }
    }, timeoutMs);

    pending.set(id, { resolve, timeoutId });

    if (typeof window !== "undefined") {
      try {
        window.postMessage(
          {
            id,
            request,
            source: BRIDGE_SOURCE_WEB,
            type: "request",
          },
          window.location.origin,
        );
      } catch (error) {
        clearTimeout(timeoutId);
        pending.delete(id);
        resolve({
          error: {
            code: "EXTENSION_ERROR",
            message:
              error instanceof Error ? error.message : "Failed to send request",
          },
          ok: false,
        });
      }
    }
  });
}

export function abortViaExtension(id: string): void {
  if (typeof window === "undefined") return;
  const entry = pending.get(id);
  if (entry) {
    clearTimeout(entry.timeoutId);
    pending.delete(id);
    entry.resolve({
      error: { code: "ABORTED", message: "Request aborted" },
      ok: false,
    });
  }
  try {
    window.postMessage(
      {
        id,
        source: BRIDGE_SOURCE_WEB,
        type: "abort",
      },
      window.location.origin,
    );
  } catch {
    // Ignore errors
  }
}
