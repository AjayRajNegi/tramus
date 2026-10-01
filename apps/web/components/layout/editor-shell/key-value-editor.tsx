"use client";

import { Trash2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type KeyValue = {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
};

export const createKeyValue = (patch: Partial<KeyValue> = {}): KeyValue => ({
  enabled: true,
  id: crypto.randomUUID(),
  key: "",
  value: "",
  ...patch,
});

type KeyValueEditorProps = {
  rows: KeyValue[];
  onChange: (rows: KeyValue[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  readOnly?: boolean;
  className?: string;
};

const GRID = "grid grid-cols-[2.5rem_1fr_1fr_2.5rem] divide-x";

const cellInput =
  "h-9 rounded-none border-0 bg-transparent px-3 font-mono text-sm shadow-none " +
  "focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring " +
  "dark:bg-transparent";

export function KeyValueEditor({
  rows,
  onChange,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
  readOnly = false,
  className,
}: KeyValueEditorProps) {
  const [ghostId, setGhostId] = React.useState(() => crypto.randomUUID());

  const updateRow = (id: string, patch: Partial<KeyValue>) => {
    if (id === ghostId) {
      onChange([...rows, createKeyValue({ id, ...patch })]);
      setGhostId(crypto.randomUUID());
      return;
    }
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRow = (id: string) => onChange(rows.filter((r) => r.id !== id));

  const visibleRows: KeyValue[] = readOnly
    ? rows
    : [...rows, { enabled: true, id: ghostId, key: "", value: "" }];

  return (
    <div className={cn("overflow-hidden rounded-md border text-sm", className)}>
      <div
        className={cn(
          GRID,
          "bg-muted/50 font-medium text-muted-foreground text-xs",
        )}
      >
        <div />
        <div className="px-3 py-1.5">{keyPlaceholder}</div>
        <div className="px-3 py-1.5">{valuePlaceholder}</div>
        <div />
      </div>

      {/* Rows */}
      <div className="divide-y border-t">
        {visibleRows.map((row) => (
          <KeyValueRow
            isGhost={!readOnly && row.id === ghostId}
            key={row.id}
            keyPlaceholder={keyPlaceholder}
            onRemove={removeRow}
            onUpdate={updateRow}
            readOnly={readOnly}
            row={row}
            valuePlaceholder={valuePlaceholder}
          />
        ))}
      </div>
    </div>
  );
}

type KeyValueRowProps = {
  row: KeyValue;
  isGhost: boolean;
  readOnly: boolean;
  keyPlaceholder: string;
  valuePlaceholder: string;
  onUpdate: (id: string, patch: Partial<KeyValue>) => void;
  onRemove: (id: string) => void;
};

function KeyValueRow({
  row,
  isGhost,
  readOnly,
  keyPlaceholder,
  valuePlaceholder,
  onUpdate,
  onRemove,
}: KeyValueRowProps) {
  const muted = !row.enabled && "text-muted-foreground";

  // Enter in the key field jumps to the value field of the same row.
  const handleKeyEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    e.currentTarget
      .closest<HTMLElement>("[data-kv-row]")
      ?.querySelector<HTMLInputElement>("[data-kv-value]")
      ?.focus();
  };

  return (
    <div className={cn(GRID, "group")} data-kv-row>
      {/* Enabled toggle (hidden on the empty trailing row) */}
      <div className="flex items-center justify-center">
        {!isGhost && (
          <Checkbox
            aria-label={`${row.enabled ? "Disable" : "Enable"} ${row.key || "row"}`}
            checked={row.enabled}
            disabled={readOnly}
            onCheckedChange={(checked) =>
              onUpdate(row.id, { enabled: checked === true })
            }
          />
        )}
      </div>

      <Input
        aria-label={keyPlaceholder}
        autoComplete="off"
        className={cn(cellInput, muted)}
        onChange={(e) => onUpdate(row.id, { key: e.target.value })}
        onKeyDown={handleKeyEnter}
        placeholder={keyPlaceholder}
        readOnly={readOnly}
        spellCheck={false}
        value={row.key}
      />

      <Input
        aria-label={valuePlaceholder}
        autoComplete="off"
        className={cn(cellInput, muted)}
        data-kv-value
        onChange={(e) => onUpdate(row.id, { value: e.target.value })}
        placeholder={valuePlaceholder}
        readOnly={readOnly}
        spellCheck={false}
        value={row.value}
      />

      {/* Delete (hidden on the empty trailing row) */}
      <div className="flex items-center justify-center">
        {!isGhost && !readOnly && (
          <Button
            aria-label={`Delete ${row.key || "row"}`}
            className="size-7 text-muted-foreground hover:text-destructive md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
            onClick={() => onRemove(row.id)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
