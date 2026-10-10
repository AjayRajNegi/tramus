import { describe, expect, test } from "bun:test";
import { decodeBody } from "./execute";

const bytes = (s: string) => new TextEncoder().encode(s).buffer as ArrayBuffer;

describe("decodeBody", () => {
  test("decodes UTF-8 by default", () => {
    expect(decodeBody(bytes("héllo ✓"), null)).toBe("héllo ✓");
  });
  test("honours charset from content-type", () => {
    const latin1 = new Uint8Array([0x68, 0xe9]).buffer;
    expect(decodeBody(latin1, "text/plain; charset=iso-8859-1")).toBe("hé");
  });
  test("falls back to UTF-8 on unknown charset", () => {
    expect(decodeBody(bytes("ok"), "text/plain; charset=banana")).toBe("ok");
  });
  test("handles empty body", () => {
    expect(decodeBody(new ArrayBuffer(0), "application/json")).toBe("");
  });
  test("parses quoted charset", () => {
    expect(decodeBody(bytes("ok"), 'text/html; charset="utf-8"')).toBe("ok");
  });
});
