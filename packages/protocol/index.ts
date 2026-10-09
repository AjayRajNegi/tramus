export const BRIDGE_SOURCE_WEB = "tramus-web" as const;

export const BRIDGE_SOURCE_EXT = "tramus-ext" as const;

export type WebPing = {
  source: typeof BRIDGE_SOURCE_WEB;
  type: "ping";
};

export type ExtPong = {
  source: typeof BRIDGE_SOURCE_EXT;
  type: "pong";
  version: string;
};

export type WebToExt = WebPing;
export type ExtToWeb = ExtPong;

export type BackgroundPing = { type: "ping" };
export type BackgroundPong = { type: "pong"; version: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isWebToExt(value: unknown): value is WebToExt {
  return (
    isRecord(value) &&
    value.source === BRIDGE_SOURCE_WEB &&
    value.type === "ping"
  );
}

export function isExtToWeb(value: unknown): value is ExtToWeb {
  return (
    isRecord(value) &&
    value.source === BRIDGE_SOURCE_EXT &&
    value.type === "pong" &&
    typeof value.version === "string"
  );
}

export function isBackgroundPing(value: unknown): value is BackgroundPing {
  return isRecord(value) && value.type === "ping";
}

export function isBackgroundPong(value: unknown): value is BackgroundPong {
  return (
    isRecord(value) &&
    value.type === "pong" &&
    typeof value.version === "string"
  );
}
