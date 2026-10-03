"use client";

import { cn } from "cn";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export type KeyValue = {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
};

type EditorProps = {
  rows: KeyValue[];
  onChange: (rows: KeyValue[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  readOnly?: boolean;
  className?: string;
};

export function Editor({
  rows,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
  readOnly = false,
  className,
}: EditorProps) {
  const [ghostId, setGhostId] = useState(() => crypto.randomUUID());

  return (
    <div>
      <div>
        <div>{keyPlaceholder}</div>
        <div>{valuePlaceholder}</div>
      </div>

      {/* Rows */}
      <div>{}</div>
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

      <div className="flex items-center justify-center">
        {!isGhost && !readOnly && (
          <Button
            aria-label={`Delete ${row.key || "row"}`}
            className="size-7 text-muted-foreground hover:text-destructive md:opacity-30 md:group-hover:opacity-100 md:focus-visible:opacity-100"
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
