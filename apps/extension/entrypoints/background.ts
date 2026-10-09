import {
  type BackgroundPong,
  isBackgroundPing,
} from "../node_modules/@tramus/protocol/index";
import { isAllowedOrigin } from "../utils/app-origin";

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    (message: unknown, sender, sendResponse) => {
      const origin = sender.url ? new URL(sender.url).origin : "";
      if (!isAllowedOrigin(origin) || sender.frameId !== 0) return false;

      if (isBackgroundPing(message)) {
        const reply: BackgroundPong = {
          type: "pong",
          version: browser.runtime.getManifest().version,
        };
        sendResponse(reply);
      }
      return false;
    },
  );
});
