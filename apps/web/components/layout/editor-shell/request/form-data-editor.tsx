import type { FileValue, FormDataRow } from "@/lib/store/tab.store.types";
import { cn } from "@/lib/utils";

const MAX_TOTAL_SIZE = 50 * 1024 * 1024;

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

const newRow = (): FormDataRow => ({
  enabled: true,
  files: [],
  id: crypto.randomUUID(),
  key: "",
  kind: "text",
  text: "",
});

type Props = {
  rows: FormDataRow[];
  onChange: (rows: FormDataRow[]) => void;
  readOnly?: boolean;
  className?: string;
};

export function FormDataEditor({
  rows,
  onChange,
  readOnly = false,
  className,
}: Props) {
  const totalSize = rows.reduce(
    (sum, r) => sum + r.files.reduce((s, f) => s + f.size, 0),
    0,
  );

  const update = (id: string, patch: Partial<FormDataRow>) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const remove = (id: string) => onChange(rows.filter((r) => r.id !== id));

  const addFiles = async (row: FormDataRow, list: FileList | null) => {
    if (!list?.length) return;
    const incoming = Array.from(list);
    const incomingSize = incoming.reduce((s, f) => s + f.size, 0);
    if (totalSize + incomingSize > MAX_TOTAL_SIZE) {
      alert(
        `Total file size exceeds ${MAX_TOTAL_SIZE / 1024 / 1024} MB limit.`,
      );
      return;
    }
    const converted: FileValue[] = await Promise.all(
      incoming.map(async (f) => ({
        base64: await fileToBase64(f),
        name: f.name,
        size: f.size,
        type: f.type || "application/octet-stream",
      })),
    );
    update(row.id, { files: [...row.files, ...converted] });
  };

  const last = rows[rows.length - 1];
  const displayRows =
    readOnly || (last && !last.key && !last.text && last.files.length === 0)
      ? rows
      : [...rows, newRow()];

  return (
    <div className={cn("text-sm", className)}>
      <div className="grid grid-cols-[28px_1fr_90px_2fr_28px] gap-2 border-accent/30 border-b bg-muted/30 px-2 py-1.5 font-medium text-muted-foreground text-xs">
        <span />
        <span>Key</span>
        <span>Type</span>
        <span>Value</span>
        <span />
      </div>

      {displayRows.map((row) => {
        const isPlaceholder = !rows.some((r) => r.id === row.id);
        const commit = (patch: Partial<FormDataRow>) =>
          isPlaceholder
            ? onChange([...rows, { ...row, ...patch }])
            : update(row.id, patch);

        return (
          <div
            className="grid grid-cols-[28px_1fr_90px_2fr_28px] items-start gap-2 border-accent/30 border-b px-2 py-1.5"
            key={row.id}
          >
            <input
              checked={row.enabled}
              disabled={readOnly || isPlaceholder}
              onChange={(e) => commit({ enabled: e.target.checked })}
              type="checkbox"
            />
            <input
              className="rounded border bg-transparent px-2 py-1"
              disabled={readOnly}
              onChange={(e) => commit({ key: e.target.value })}
              placeholder="Key"
              value={row.key}
            />
            <select
              className="rounded border bg-transparent px-1 py-1"
              disabled={readOnly}
              onChange={(e) =>
                commit({ kind: e.target.value as FormDataRow["kind"] })
              }
              value={row.kind}
            >
              <option value="text">Text</option>
              <option value="file">File</option>
            </select>

            {row.kind === "text" ? (
              <input
                className="rounded border bg-transparent px-2 py-1"
                disabled={readOnly}
                onChange={(e) => commit({ text: e.target.value })}
                placeholder="Value"
                value={row.text}
              />
            ) : (
              <div className="space-y-1">
                {row.files.map((f, i) => (
                  <div
                    className="flex items-center gap-2 rounded border bg-muted/30 px-2 py-1"
                    key={`${f.name}-${i}`}
                  >
                    <span className="min-w-0 flex-1 truncate font-mono text-xs">
                      {f.name}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {(f.size / 1024).toFixed(1)} KB
                    </span>
                    {!readOnly && (
                      <button
                        className="text-muted-foreground text-xs hover:text-foreground"
                        onClick={() =>
                          commit({ files: row.files.filter((_, j) => j !== i) })
                        }
                        type="button"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {!readOnly && (
                  <input
                    className="block w-full text-muted-foreground text-xs file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-primary-foreground"
                    multiple
                    onChange={async (e) => {
                      const target = e.target;
                      if (isPlaceholder) {
                        onChange([...rows, row]);
                      }
                      await addFiles(row, target.files);
                      target.value = ""; // allow re-selecting same file
                    }}
                    type="file"
                  />
                )}
              </div>
            )}

            {!readOnly && !isPlaceholder ? (
              <button
                className="text-muted-foreground hover:text-destructive"
                onClick={() => remove(row.id)}
                type="button"
              >
                ✕
              </button>
            ) : (
              <span />
            )}
          </div>
        );
      })}
    </div>
  );
}
