import { execute } from "@/utils/execute";
import {
  type BackgroundPong,
  type BackgroundResponse,
  isBackgroundAbort,
  isBackgroundPing,
  isBackgroundRequest,
} from "../node_modules/@tramus/protocol/index";

const inFlightControllers = new Map<string, AbortController>();

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
        const controller = new AbortController();
        inFlightControllers.set(message.request.id ?? crypto.randomUUID(), controller);

        execute(message.request, 30000, controller.signal)
          .then((result) => {
            inFlightControllers.delete(message.request.id ?? "");
            const reply: BackgroundResponse = { result, type: "response" };
            sendResponse(reply);
          })
          .catch(() => {
            inFlightControllers.delete(message.request.id ?? "");
          });
        return true;
      }

      if (isBackgroundAbort(message)) {
        const controller = inFlightControllers.get(message.id);
        if (controller) {
          controller.abort();
          inFlightControllers.delete(message.id);
        }
        sendResponse({ ok: true });
        return false;
      }

      return false;
    },
  );
});
