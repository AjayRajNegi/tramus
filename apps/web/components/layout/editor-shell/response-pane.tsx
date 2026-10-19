import { useEditorState } from "@/lib/store/editor.store";

export default function ResponsePane() {
  // const activeId = useEditorState((s) => s.activeId);

  const entry = useEditorState((s) =>
    s.activeId ? s.drafts[s.activeId] : undefined,
  );

  console.log(entry);
  return (
    <div className="p-4">
      Response
      {/* <div>
        {entry?.baseline.response.status} -{" "}
        {entry?.baseline.response.ok ? "successfull" : "failed"}
      </div>
      <div>{entry?.baseline.response.body}</div> */}
    </div>
  );
}
