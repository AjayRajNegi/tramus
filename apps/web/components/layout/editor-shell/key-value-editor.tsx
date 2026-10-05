"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { KeyValueRow } from "./key-value-row";

const GRID = "grid grid-cols-[2.5rem_1fr_1fr_2.5rem] divide-x";

export type KeyValue = {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
};

type KeyValueEditorProps = {
  rows: KeyValue[];
  onChange: (rows: KeyValue[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  readOnly?: boolean;
  className?: string;
};

export const createKeyValue = (patch: Partial<KeyValue> = {}): KeyValue => ({
  enabled: true,
  id: crypto.randomUUID(),
  key: "",
  value: "",
  ...patch,
});

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
    // console.log(rows);
  };

  const removeRow = (id: string) => onChange(rows.filter((r) => r.id !== id));

  const visibleRows: KeyValue[] = readOnly
    ? rows
    : [...rows, { enabled: true, id: ghostId, key: "", value: "" }];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-accent/50 text-sm",
        className,
      )}
    >
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
      <div className="divide-y border-accent/50 border-t">
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
