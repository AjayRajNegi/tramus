import {
  BRIDGE_SOURCE_EXT,
  type ExtToWeb,
  isBackgroundPong,
  isWebToExt,
} from "../node_modules/@tramus/protocol/index";
import { APP_MATCH_PATTERNS } from "../utils/app-origin";

// `defineContentScript` and `browser` are auto-imported by WXT.
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
          // Round-trip through the background worker so 'connected' means the whole chain works.
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
        } catch {
          // Background unreachable: stay silent so the app reports 'not installed'.
        }
      }
    });

    // Best-effort announcement. The page may not be listening yet, so the app also pings.
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
