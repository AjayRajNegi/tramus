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
        ) : (
          <div>Fetching....</div>
        )}
      </div>
    </div>
  );
}
