import { buildUrl, clone, normalizeDraft } from "../helpers";
import { dropTab, openTabIn } from "../ops";
import type { EditorSlice, SliceCreator, TabId } from "../types";

export const createEditorSlice: SliceCreator<EditorSlice> = (set, get) => ({
  closeTab: (wsId, tabId) => {
    set((s) => {
      const w = s.workspaces[wsId];

      if (w.tabs.length <= 1) {
        return;
      }
      get().abortRequest(tabId);
      if (w) dropTab(s, w, tabId);
    });
  },

  markSaved: (wsId, tabId, saved) =>
    set((s) => {
      const w = s.workspaces[wsId];
      const entry = w?.drafts[tabId];
      const tab = w?.tabs.find((t) => t.id === tabId);
      if (!w || !entry || !tab) return;

      const next = normalizeDraft(saved ?? entry.draft);
      entry.draft = clone(next);
      entry.baseline = clone(next);
      entry.status = "saved";
      entry.error = undefined;

      const endpoint = w.endpoints[tab.endpointId];
      if (endpoint) endpoint.definition = clone(next);
    }),

  openTab: (wsId, { endpointId, scenarioId }) => {
    const result: { id: TabId | null } = { id: null };
    set((s) => {
      const w = s.workspaces[wsId];
      if (!w) return;
      result.id = openTabIn(w, endpointId, scenarioId ?? w.activeScenarioId);
    });
    return result.id;
  },

  resetDraft: (wsId, tabId, base) =>
    set((s) => {
      const entry = s.workspaces[wsId]?.drafts[tabId];
      if (!entry) return;

      entry.draft = clone(base ?? entry.baseline);
      if (base) entry.baseline = clone(base);
      entry.status = "idle";
      entry.error = undefined;
    }),

  setActiveTab: (wsId, tabId) =>
    set((s) => {
      const w = s.workspaces[wsId];
      if (!w) return;
      if (tabId === null) {
        w.activeTabId = null;
        return;
      }
      const tab = w.tabs.find((t) => t.id === tabId);
      if (!tab) return;
      w.activeTabId = tab.id;
      w.activeScenarioId = tab.scenarioId;
    }),

  setStatus: (wsId, tabId, status, error) =>
    set((s) => {
      const entry = s.workspaces[wsId]?.drafts[tabId];
      if (!entry) return;
      entry.status = status;
      entry.error = error;
    }),

  updateDraft: (wsId, tabId, recipe) =>
    set((s) => {
      const entry = s.workspaces[wsId]?.drafts[tabId];
      if (!entry) return;

      recipe(entry.draft);
      entry.draft.url = buildUrl(entry.draft.url, entry.draft.params);
      entry.error = undefined;
      if (entry.status === "saved") entry.status = "idle";
    }),
});
