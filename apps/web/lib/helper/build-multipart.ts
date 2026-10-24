import type { FormDataRow } from "@/lib/store/tab.store.types";

const encoder = new TextEncoder();

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

const esc = (s: string) =>
  s.replace(/\r/g, "%0D").replace(/\n/g, "%0A").replace(/"/g, "%22");

export function buildMultipart(
  rows: FormDataRow[],
): { base64: string; contentType: string } | null {
  const boundary = `----TramusFormBoundary${crypto.randomUUID().replace(/-/g, "")}`;
  const chunks: Uint8Array[] = [];

  const push = (s: string) => chunks.push(encoder.encode(s));

  for (const row of rows) {
    const key = row.key.trim();
    if (!row.enabled || !key) continue;

    if (row.kind === "text") {
      push(`--${boundary}\r\n`);
      push(`Content-Disposition: form-data; name="${esc(key)}"\r\n\r\n`);
      push(`${row.text}\r\n`);
    } else {
      for (const f of row.files) {
        push(`--${boundary}\r\n`);
        push(
          `Content-Disposition: form-data; name="${esc(key)}"; filename="${esc(f.name)}"\r\n`,
        );
        push(`Content-Type: ${f.type || "application/octet-stream"}\r\n\r\n`);
        chunks.push(base64ToBytes(f.base64));
        push("\r\n");
      }
    }
  }

  if (chunks.length === 0) return null;
  push(`--${boundary}--\r\n`);

  const total = chunks.reduce((n, c) => n + c.length, 0);
  const all = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    all.set(c, offset);
    offset += c.length;
  }

  return {
    base64: bytesToBase64(all),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}
