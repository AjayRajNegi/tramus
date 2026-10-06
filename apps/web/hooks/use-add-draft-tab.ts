import { type EndpointDraft, useEditorState } from "@/lib/store/editor.store";

const createEmptyDraft = (): EndpointDraft => ({
  authorization: { password: "", token: "", type: "none", username: "" },
  body: { form: [], json: "", raw: "", type: "none" },
  headers: [],
  method: "GET",
  params: [],
  path: "http://localhost:3000",
  url: "",
});

export function useAddDraftTab() {
  const ensureDraft = useEditorState((s) => s.ensureDraft);
  const openTab = useEditorState((s) => s.openTab);

  return (ctx: { workspaceId: string; scenarioId: string }) => {
    const id = crypto.randomUUID();

    ensureDraft(id, createEmptyDraft());
    openTab({
      endpointId: `new-${id}`,
      id,
      scenarioId: ctx.scenarioId,
      workspaceId: ctx.workspaceId,
    });

    return id;
  };
}
