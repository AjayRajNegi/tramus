"use client";

import { AlertTriangle, Download, File, Image } from "lucide-react";
import { useEditorState } from "@/lib/store/editor.store";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function downloadBlob(objectUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function ResponsePane() {
  const response = useEditorState((s) =>
    s.activeId ? s.responses[s.activeId] : undefined,
  );

  if (response?.phase === "success") {
    const { body, status, statusText, timing, size, url } = response.response;
    const _isBinary =
      body.kind === "image" || body.kind === "pdf" || body.kind === "binary";
    const mimeType = body.mimeType || "";
    const filename =
      url.split("/").pop() || `response.${mimeType.split("/")[1] || "bin"}`;

    return (
      <div className="p-5">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm">
            {status} {statusText}
          </span>
          <span className="text-muted-foreground text-sm">
            {timing.total}ms
          </span>
          <span className="text-muted-foreground text-sm">
            {formatBytes(size.total)}
          </span>
          {body.truncated && (
            <span className="flex items-center gap-1 text-amber-500 text-xs">
              <AlertTriangle className="size-3" />
              Response truncated (20 MB limit)
            </span>
          )}
        </div>

        <div className="space-y-2">
          {body.kind === "image" && body.objectUrl && (
            <div>
              <div className="mb-1 flex items-center gap-2 text-muted-foreground text-sm">
                <Image className="size-4" />
                <span>
                  Image ({mimeType}) - {formatBytes(body.size)}
                </span>
              </div>
              <img
                alt=""
                className="max-h-[400px] max-w-full rounded border"
                src={body.objectUrl}
              />
            </div>
          )}

          {(body.kind === "pdf" || body.kind === "binary") &&
            body.objectUrl && (
              <div className="flex items-center gap-3 rounded border p-3">
                <File className="size-6 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-sm">{filename}</div>
                  <div className="text-muted-foreground text-xs">
                    {body.kind === "pdf" ? "PDF" : "Binary"} (
                    {mimeType || "unknown"}) - {formatBytes(body.size)}
                  </div>
                </div>
                <button
                  className="flex cursor-pointer items-center gap-1 rounded border px-3 py-1.5 text-sm hover:bg-accent"
                  onClick={() =>
                    body.objectUrl && downloadBlob(body.objectUrl, filename)
                  }
                >
                  <Download className="size-4" />
                  Download
                </button>
              </div>
            )}

          {(body.kind === "json" ||
            body.kind === "xml" ||
            body.kind === "html" ||
            body.kind === "text") && (
            <pre className="max-h-[400px] overflow-auto whitespace-pre-wrap rounded bg-muted p-3 font-mono text-sm">
              {body.parseError ? (
                <span className="text-destructive">
                  Parse error: {body.parseError}
                </span>
              ) : (
                body.text
              )}
            </pre>
          )}

          {body.kind === "empty" && (
            <div className="py-8 text-center text-muted-foreground">
              (empty response)
            </div>
          )}
        </div>
      </div>
    );
  }

  if (response?.phase === "error") {
    return (
      <div className="p-4">
        <div className="text-destructive">
          <div className="font-mono text-sm">
            Error: {response.failure.code}
          </div>
          <div className="text-sm">{response.failure.message}</div>
          <div className="text-muted-foreground text-xs">
            Duration: {response.failure.duration}ms
          </div>
        </div>
      </div>
    );
  }

  if (response?.phase === "loading") {
    return <div className="p-4">Fetching....</div>;
  }

  return <div className="p-4 text-muted-foreground">No response yet</div>;
}
