import {
  BRIDGE_SOURCE_WEB,
  isExtToWeb,
  type TramusRequest,
  type TramusResult,
} from "@tramus/protocol";

type PendingResolver = (result: TramusResult) => void;

const pending = new Map<string, PendingResolver>();

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

    const resolver = pending.get(event.data.id);
    if (resolver) {
      pending.delete(event.data.id);
      resolver(event.data.result);
    }
  });
}

export function sendViaExtension(
  request: TramusRequest,
): Promise<TramusResult> {
  ensureListener();

  console.log("sendViaExtension");

  const id = crypto.randomUUID();

  return new Promise((resolve) => {
    pending.set(id, resolve);

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
        console.log("postMessage");
      } catch (error) {
        error instanceof Error
          ? console.log(error.message)
          : console.log(error);
      }
    }
  });
}
