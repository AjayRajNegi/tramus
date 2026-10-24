import { useEditorState } from "@/lib/store/editor.store";
import type { EndpointDraft } from "@/lib/store/tab.store.types";

const createEmptyDraft = (): EndpointDraft => ({
  authorization: { password: "", token: "", type: "none", username: "" },
  body: { form: [], formData: [], json: "", raw: "", type: "none" },
  headers: [],
  method: "GET",
  params: [],
  path: "http://localhost:3000",
  // response: {
  //   body: '{"message":"Hello Draft"}',
  //   ok: true,
  //   status: 200,
  // },
  url: "",
});

export function useAddDraftTab() {
  const ensureDraft = useEditorState((s) => s.ensureDraft);
  const openTab = useEditorState((s) => s.openTab);

  return (ctx: { workspaceId: string; scenarioId: string }) => {
    const id = crypto.randomUUID();

    ensureDraft(`tab-${id.substring(0, 5)}`, createEmptyDraft());
    openTab({
      endpointId: id,
      id: `tab-${id.substring(0, 5)}`,
      scenarioId: ctx.scenarioId,
      workspaceId: ctx.workspaceId,
    });

    return id;
  };
}
