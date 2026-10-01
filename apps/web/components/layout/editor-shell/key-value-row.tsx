import { cn } from "cn";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { KeyValue } from "./key-value-editor";

const GRID = "grid grid-cols-[2.5rem_1fr_1fr_2.5rem] divide-x";

const cellInput =
  "h-9 rounded-none border-0 bg-transparent px-3 font-mono text-sm shadow-none " +
  "focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring " +
  "dark:bg-transparent";

type KeyValueRowProps = {
  row: KeyValue;
  isGhost: boolean;
  readOnly: boolean;
  keyPlaceholder: string;
  valuePlaceholder: string;
  onUpdate: (id: string, patch: Partial<KeyValue>) => void;
  onRemove: (id: string) => void;
};

export function KeyValueRow({
  row,
  isGhost,
  readOnly,
  keyPlaceholder,
  valuePlaceholder,
  onUpdate,
  onRemove,
}: KeyValueRowProps) {
  const muted = !row.enabled && "text-muted-foreground";

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
