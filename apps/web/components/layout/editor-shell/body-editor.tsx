"use client";

import { json, jsonParseLinter } from "@codemirror/lang-json";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { linter } from "@codemirror/lint";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import CodeMirror from "@uiw/react-codemirror";
import { FileIcon } from "lucide-react";
import * as React from "react";
import type { BodyType, RequestBody } from "@/lib/store/tab.store.types";
import { cn } from "@/lib/utils";
import { KeyValueEditor } from "./key-value-editor";

export const createBody = (patch: Partial<RequestBody> = {}): RequestBody => ({
  file: null,
  form: [],
  json: "",
  raw: "",
  type: "none",
  ...patch,
});

type BodyEditorProps = {
  value: RequestBody;
  onChange: (value: RequestBody) => void;
  readOnly?: boolean;
  className?: string;
};

const BODY_TYPES: { value: BodyType; label: string }[] = [
  { label: "None", value: "none" },
  { label: "JSON", value: "json" },
  { label: "Form", value: "form" },
  { label: "Raw", value: "raw" },
  { label: "File", value: "file" },
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const editorTheme = EditorView.theme({
  ".cm-activeLine": { backgroundColor: "rgba(128,128,128,0.10)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", opacity: 1 },
  ".cm-content": { caretColor: "currentColor", padding: "8px 0" },
  ".cm-foldPlaceholder": {
    backgroundColor: "rgba(128,128,128,0.2)",
    border: "none",
    color: "inherit",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    border: "none",
    color: "inherit",
    opacity: 0.45,
  },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 12px 0 16px" },
  ".cm-nonmatchingBracket": { outline: "1px solid rgb(239,68,68)" },
  ".cm-scroller": {
    fontFamily:
      "ui-monospace, SFMono-Regular, 'JetBrains Mono', Menlo, Consolas, monospace",
    lineHeight: "1.65",
  },
  "&": { backgroundColor: "transparent", fontSize: "13px" },
  "&.cm-focused": { outline: "none" },
  // The blue box around matching brackets, as in the reference screenshot
  "&.cm-focused .cm-matchingBracket, .cm-matchingBracket": {
    backgroundColor: "rgba(99,102,241,0.2)",
    borderRadius: "2px",
    outline: "1px solid rgb(99,102,241)",
  },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground":
    { backgroundColor: "rgba(99,102,241,0.25)" },
});

const highlightStyle = HighlightStyle.define([
  { color: "#d946ef", tag: t.propertyName }, // JSON keys
  { color: "#818cf8", tag: t.string },
  { color: "#f59e0b", tag: [t.number, t.integer, t.float] },
  { color: "#14b8a6", tag: [t.bool, t.null] },
  { color: "inherit", tag: [t.brace, t.squareBracket, t.punctuation] },
]);

const baseExtensions = [
  editorTheme,
  syntaxHighlighting(highlightStyle),
  EditorView.lineWrapping,
];

const jsonExtensions = [...baseExtensions, json(), linter(jsonParseLinter())];

export function BodyEditor({
  value,
  onChange,
  readOnly = false,
  className,
}: BodyEditorProps) {
  const set = (patch: Partial<RequestBody>) => onChange({ ...value, ...patch });

  const jsonError = React.useMemo(() => {
    if (value.type !== "json" || !value.json.trim()) {
      return null;
    }
    try {
      JSON.parse(value.json);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Invalid JSON";
    }
  }, [value.type, value.json]);

  const prettify = () => {
    try {
      set({ json: JSON.stringify(JSON.parse(value.json), null, 2) });
    } catch {}
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-accent/30 text-sm",
        className,
      )}
    >
      {/* Type switcher */}
      <div className="flex items-center justify-between gap-2 border-accent/30 border-b bg-muted/50 px-2 py-1.5">
        <div aria-label="Body type" className="flex gap-1" role="radiogroup">
          {BODY_TYPES.map((type) => {
            const active = value.type === type.value;
            return (
              <button
                aria-checked={active}
                className={cn(
                  "rounded px-2.5 py-1 font-medium text-xs transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                  readOnly && "pointer-events-none",
                )}
                disabled={readOnly && !active}
                key={type.value}
                onClick={() => set({ type: type.value })}
                role="radio"
                type="button"
              >
                {type.label}
              </button>
            );
          })}
        </div>

        {value.type === "json" && !readOnly && (
          <button
            className="rounded px-2 py-1 text-muted-foreground text-xs hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            disabled={!value.json.trim() || jsonError !== null}
            onClick={prettify}
            type="button"
          >
            Prettify
          </button>
        )}
      </div>

      {/* Body */}
      {value.type === "none" && (
        <div className="px-3 py-10 text-center text-muted-foreground text-xs">
          This request does not have a body.
        </div>
      )}

      {value.type === "form" && (
        <KeyValueEditor
          className="rounded-none border-0"
          keyPlaceholder="Field"
          onChange={(form) => set({ form })}
          readOnly={readOnly}
          rows={value.form}
        />
      )}

      {(value.type === "json" || value.type === "raw") && (
        <>
          <div className="border-accent/30 border-b bg-muted/30 px-3 py-1.5 font-medium text-muted-foreground text-xs">
            Raw Request Body
          </div>
          <CodeMirror
            basicSetup={{
              autocompletion: false,
              bracketMatching: true,
              closeBrackets: true,
              foldGutter: true,
              highlightActiveLine: true,
              highlightActiveLineGutter: true,
              lineNumbers: true,
              lintKeymap: false,
              searchKeymap: false,
            }}
            className="min-h-[200px]"
            editable={!readOnly}
            extensions={value.type === "json" ? jsonExtensions : baseExtensions}
            height="auto"
            key={value.type}
            maxHeight="480px"
            minHeight="200px"
            onChange={(next) =>
              set(value.type === "json" ? { json: next } : { raw: next })
            }
            placeholder={value.type === "json" ? '{\n  "key": "value"\n}' : ""}
            readOnly={readOnly}
            theme="none"
            value={value.type === "json" ? value.json : value.raw}
          />
          {jsonError && (
            <div className="truncate border-accent/30 border-t bg-destructive/5 px-3 py-1.5 text-destructive text-xs">
              {jsonError}
            </div>
          )}
        </>
      )}

      {value.type === "file" && (
        <div className="p-3">
          {value.file ? (
            <div className="flex items-center gap-3 rounded border bg-muted/30 p-3">
              <FileIcon className="size-6 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-sm">
                  {value.file.name}
                </div>
                <div className="text-muted-foreground text-xs">
                  {value.file.type || "unknown"} -{" "}
                  {(value.file.size / 1024).toFixed(1)} KB
                </div>
              </div>
              <button
                className="text-muted-foreground text-sm hover:text-foreground"
                onClick={() => set({ file: null })}
                type="button"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                className="block w-full text-muted-foreground text-sm file:mr-4 file:rounded file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground file:text-sm hover:file:bg-primary/90"
                disabled={readOnly}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > MAX_FILE_SIZE) {
                    alert(
                      `File size exceeds 20 MB limit. Selected file is ${(file.size / 1024 / 1024).toFixed(2)} MB.`,
                    );
                    return;
                  }
                  const base64 = await fileToBase64(file);
                  set({
                    file: {
                      base64,
                      name: file.name,
                      size: file.size,
                      type: file.type,
                    },
                  });
                }}
                type="file"
              />
              <p className="text-muted-foreground text-xs">
                Maximum file size: 20 MB
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(",")[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
