import { useEditorState } from "@/lib/store/editor.store";

export default function ResponsePane() {
  const response = useEditorState((s) =>
    s.activeId ? s.responses[s.activeId] : undefined,
  );
  return (
    <div className="p-4">
      <h4>Responses</h4>
      <div>
        {response?.phase === "success" ? (
          <div>
            <div className="flex">
              {response.response.status} - {response.response.timing.total}ms -
              {response.response.size.total}kb
            </div>
            <div>
              {response.response.body.kind === "json"
                ? response.response.body.text
                : "No body"}
            </div>
          </div>
        ) : response?.phase === "error" ? (
          <div className="text-destructive">
            <div className="font-mono text-sm">
              Error: {response.failure.code}
            </div>
            <div className="text-sm">{response.failure.message}</div>
            <div className="text-muted-foreground text-xs">
              Duration: {response.failure.duration}ms
            </div>
          </div>
        ) : response?.phase === "loading" ? (
          <div>Fetching....</div>
        ) : (
          <div className="text-muted-foreground">No response yet</div>
        )}
      </div>
    </div>
  );
}
