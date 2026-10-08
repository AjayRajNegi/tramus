"use client";

import { json, jsonParseLinter } from "@codemirror/lang-json";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { linter } from "@codemirror/lint";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import CodeMirror from "@uiw/react-codemirror";
import * as React from "react";
import type { BodyType, RequestBody } from "@/lib/store/editor.store";
import { cn } from "@/lib/utils";
import { KeyValueEditor } from "./key-value-editor";

export const createBody = (patch: Partial<RequestBody> = {}): RequestBody => ({
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
];

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
    </div>
  );
}
