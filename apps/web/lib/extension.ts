import {
  BRIDGE_SOURCE_WEB,
  isExtToWeb,
} from "../node_modules/@tramus/protocol";

export type ExtensionStatus =
  | { installed: true; version: string }
  | { installed: false };

export function isExtensionInstalled(
  timeoutMs = 1500,
): Promise<ExtensionStatus> {
  return new Promise((resolve) => {
    let done = false;

    const finish = (status: ExtensionStatus) => {
      if (done) return;
      done = true;
      window.removeEventListener("message", onMessage);
      clearTimeout(timer);
      resolve(status);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin)
        return;
      if (!isExtToWeb(event.data) || event.data.type !== "pong") return;
      finish({ installed: true, version: event.data.version });
    };

    window.addEventListener("message", onMessage);
    const timer = setTimeout(() => finish({ installed: false }), timeoutMs);

    window.postMessage(
      { source: BRIDGE_SOURCE_WEB, type: "ping" },
      window.location.origin,
    );
  });
}
