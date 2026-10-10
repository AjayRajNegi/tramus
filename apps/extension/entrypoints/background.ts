import { execute } from "@/utils/execute";
import {
  type BackgroundPong,
  type BackgroundResponse,
  isBackgroundPing,
  isBackgroundRequest,
} from "../node_modules/@tramus/protocol/index";

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
        return false;
      }

      if (isBackgroundRequest(message)) {
        execute(message.request).then((result) => {
          const reply: BackgroundResponse = { result, type: "response" };
          sendResponse(reply);
        });
        return true;
      }

      return false;
    },
  );
});
