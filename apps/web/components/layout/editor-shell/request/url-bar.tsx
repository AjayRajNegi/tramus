"use client";

import type { TramusRequest, TramusResult } from "@tramus/protocol";
import { cn } from "cn";
import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { abortViaExtension } from "@/lib/extension/client";
import { httpResponseBuilder } from "@/lib/helper/http-response-builder";
import { sendRequest, toTramusRequest } from "@/lib/request/send-request";
import type { RequestErrorCode } from "@/lib/store/w/response.store.types";
import { selectActiveWorkspace } from "@/lib/store/w/selectors";
import { useWorkspaceStore } from "@/lib/store/w/workspace.store";

const METHOD_STYLES: Record<string, string> = {
  DELETE: "bg-red-500/10 text-red-600 dark:text-red-400",
  GET: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  PATCH: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  POST: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  PUT: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
};
const METHODS = ["GET", "POST", "PATCH", "DELETE", "PUT"] as const;

type Method = (typeof METHODS)[number];

type UrlBarProps = {
  initialMethod?: Method;
  initialPath?: string;
  isDirty?: boolean;
  onSave?: (method: Method, path: string) => void;
};

export function UrlBar({ isDirty = true, onSave }: UrlBarProps) {
  const ws = useWorkspaceStore(selectActiveWorkspace);
  const updateDraft = useWorkspaceStore((s) => s.updateDraft);
  const beginRequest = useWorkspaceStore((s) => s.beginRequest);
  const completeRequest = useWorkspaceStore((s) => s.completeRequest);
  const failRequest = useWorkspaceStore((s) => s.failRequest);
  const abortRequest = useWorkspaceStore((s) => s.abortRequest);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);

  if (!ws) return null;

  const workspaceId = ws.id;
  const tabId = ws.activeTabId;
  const drafts = ws.drafts;
  const draft = tabId ? drafts[tabId]?.draft : undefined;

  const method = draft?.method ?? "GET";
  const path = draft?.url ?? "http://localhost:3000";

  const setPath = (p: string) => {
    if (!tabId) return;
    updateDraft(workspaceId, tabId, (d) => {
      d.url = p;
    });
  };

  const setMethod = (m: Method) => {
    if (!tabId) return;
    updateDraft(workspaceId, tabId, (d) => {
      d.method = m;
    });
  };

  function mapErrorCode(code: string): RequestErrorCode {
    switch (code) {
      case "INVALID_REQUEST":
        return "invalid_url";
      case "NETWORK":
        return "network";
      case "TIMEOUT":
        return "timeout";
      case "EXTENSION_ERROR":
        return "unknown";
      default:
        return "unknown";
    }
  }

  async function send() {
    if (!path.trim() || !tabId) return;

    const currentDraft = drafts[tabId]?.draft;
    if (!currentDraft) return;

    const fail = (
      code: RequestErrorCode,
      message: string,
      startedAt: number,
    ) => {
      const now = Date.now();
      failRequest(tabId, {
        code,
        duration: now - startedAt,
        id: currentRequestId ?? "",
        message,
        occurredAt: now,
      });
      setCurrentRequestId(null);
    };

    const startedAt = Date.now();

    let handle: { requestId: string; nodeId: string } | undefined;
    try {
      handle = beginRequest(workspaceId, tabId);
    } catch (e) {
      fail(
        "unknown",
        e instanceof Error ? e.message : "Failed to start request",
        startedAt,
      );
      return;
    }
    setCurrentRequestId(handle.requestId);

    let request: TramusRequest;
    try {
      console.log(currentDraft);
      request = toTramusRequest(currentDraft);
      console.log(request);
    } catch {
      fail("invalid_url", "Invalid URL", startedAt);
      return;
    }

    let result: TramusResult & { requestId: string };
    try {
      result = await sendRequest(request);
      setCurrentRequestId(handle?.requestId);
    } catch (e) {
      fail(
        "unknown",
        e instanceof Error ? e.message : "Request failed",
        startedAt,
      );
      return;
    }

    if (!result.ok) {
      const code = mapErrorCode(result.error.code);
      fail(code, result.error.message, startedAt);
      return;
    }

    try {
      completeRequest(
        tabId,
        httpResponseBuilder(
          handle?.requestId,
          request,
          result.response,
          startedAt,
          Date.now(),
        ),
      );
    } catch (e) {
      fail(
        "unknown",
        e instanceof Error ? e.message : "Failed to process response",
        startedAt,
      );
    } finally {
      setCurrentRequestId(null);
    }
  }

  function abort() {
    if (!tabId || !currentRequestId) return;
    abortRequest(tabId);
    abortViaExtension(currentRequestId);
    setCurrentRequestId(null);
  }

  function save() {
    if (!path.trim()) {
      return;
    }
    onSave?.(method, path.trim());
  }

  return (
    <div className="mb-0 flex gap-2 p-5 pb-0">
      <div className="flex min-w-0 flex-1 items-center rounded-md border-0 focus-within:ring-0 focus-within:ring-ring">
        <Select
          onValueChange={(value) => setMethod(value as Method)}
          value={method}
        >
          <SelectTrigger
            className={cn(
              "w-30 shrink-0 border-0 font-mono font-semibold text-xs shadow-none focus:ring-0",
              METHOD_STYLES[method],
            )}
          >
            <SelectValue className="text-[10px]" />
          </SelectTrigger>

          <SelectContent className="max-w-30">
            {METHODS.map((m) => (
              <SelectItem className={cn(METHOD_STYLES[m])} key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* <Separator orientation="vertical" */}
        <Input
          className="min-w-0 border-0 font-mono shadow-none focus-visible:ring-0"
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              send();
            }
          }}
          placeholder="https://api.example.com/users"
          style={{ fontSize: "12px" }}
          value={path}
        />
      </div>

      <ButtonGroup>
        {currentRequestId ? (
          <Button
            className="border-destructive py-4 text-destructive hover:border-destructive"
            onClick={abort}
            size="icon"
            variant="outline"
          >
            <X className="size-4" />
          </Button>
        ) : (
          <Button
            className="border-primary py-4 hover:border-muted-foreground"
            disabled={!path.trim()}
            onClick={send}
            variant="outline"
          >
            Send
          </Button>
        )}
        <Button
          className="py-4"
          disabled={!isDirty || !path.trim() || !!currentRequestId}
          onClick={save}
          variant="outline"
        >
          Save
        </Button>
      </ButtonGroup>
    </div>
  );
}
