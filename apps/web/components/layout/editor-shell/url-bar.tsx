"use client";

import { cn } from "cn";
import { act, useEffect, useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { useEditorState } from "@/lib/store/editor.store";

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
  onSend?: (method: Method, path: string) => void;
  onSave?: (method: Method, path: string) => void;
};

export function UrlBar({
  initialMethod = "GET",
  initialPath = "",
  isDirty = false,
  onSend,
  onSave,
}: UrlBarProps) {
  const { drafts, activeId } = useEditorState();

  const [method, setMethod] = useState<Method>(
    activeId ? drafts[activeId].draft.method : "GET",
  );
  const [path, setPath] = useState(
    activeId ? drafts[activeId].draft.path : "http://localhost:3000",
  );

  useEffect(() => {
    setPath(activeId ? drafts[activeId].draft.path : "http://localhost:3000");
    setMethod(activeId ? drafts[activeId].draft.method : "GET");
  }, [activeId, drafts]);

  function send() {
    if (!path.trim()) {
      return;
    }

    onSend?.(method, path.trim());
  }

  function save() {
    if (!path.trim()) {
      return;
    }

    onSave?.(method, path.trim());
  }

  return (
    <div className="flex gap-2">
      <div className="flex min-w-0 flex-1 items-center rounded-md border focus-within:ring-1 focus-within:ring-ring">
        <Select
          onValueChange={(value) => setMethod(value as Method)}
          value={method}
        >
          <SelectTrigger
            className={cn(
              "w-28 shrink-0 border-0 font-mono font-semibold shadow-none focus:ring-0",
              METHOD_STYLES[method],
            )}
          >
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            {METHODS.map((m) => (
              <SelectItem className={cn(METHOD_STYLES[m])} key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Separator orientation="vertical" />

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
        <Button
          className="border-primary py-4 hover:border-muted-foreground"
          disabled={!path.trim()}
          onClick={send}
        >
          Send
        </Button>
        <Button
          className="py-4"
          disabled={!isDirty || !path.trim()}
          onClick={save}
          variant="outline"
        >
          Save
        </Button>
      </ButtonGroup>
    </div>
  );
}
