import {
  BRIDGE_SOURCE_EXT,
  type ExtToWeb,
  isBackgroundPong,
  isBackgroundResponse,
  isWebToExt,
} from "../node_modules/@tramus/protocol/index";
import { APP_MATCH_PATTERNS } from "../utils/app-origin";

export default defineContentScript({
  main() {
    const post = (message: ExtToWeb) =>
      window.postMessage(message, window.location.origin);

    window.addEventListener("message", async (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin)
        return;
      if (!isWebToExt(event.data)) return;

      if (event.data.type === "ping") {
        try {
          const reply: unknown = await browser.runtime.sendMessage({
            type: "ping",
          });
          if (isBackgroundPong(reply)) {
            post({
              source: BRIDGE_SOURCE_EXT,
              type: "pong",
              version: reply.version,
            });
          }
        } catch {}
      }
      if (event.data.type === "request") {
        const { id, request } = event.data;
        try {
          const reply: unknown = await browser.runtime.sendMessage({
            request,
            type: "request",
          });
          if (isBackgroundResponse(reply)) {
            post({
              id,
              result: reply.result,
              source: BRIDGE_SOURCE_EXT,
              type: "response",
            });
            return;
          }
          throw new Error("Invalid background reply");
        } catch {
          post({
            id,
            result: {
              error: {
                code: "EXTENSION_ERROR",
                message: "Extension background unreachable",
              },
              ok: false,
            },
            source: BRIDGE_SOURCE_EXT,
            type: "response",
          });
        }
      }
      if (event.data.type === "abort") {
        const { id } = event.data;
        try {
          await browser.runtime.sendMessage({
            id,
            type: "abort",
          });
        } catch {
          // Ignore errors when aborting
        }
      }
    });

    post({
      source: BRIDGE_SOURCE_EXT,
      type: "pong",
      version: browser.runtime.getManifest().version,
    });
  },
  // App origins ONLY. Never use <all_urls> here.
  matches: APP_MATCH_PATTERNS,
  runAt: "document_start",
});
