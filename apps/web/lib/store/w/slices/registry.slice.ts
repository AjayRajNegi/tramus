import { createDemoWorkspace } from "../demo";
import {
  defaultEndpointName,
  normalizeDraft,
  revokeResponseUrl,
} from "../helpers";
import { createWorkspaceData, dropTab, requireWs } from "../ops";
import type {
  RegistrySlice,
  SliceCreator,
  Workspace,
  WorkspaceStore,
} from "../types";

const clean = (name: string, fallback: string) => name.trim() || fallback;

function clearRuntime(s: WorkspaceStore, w: Workspace) {
  for (const tab of w.tabs) {
    revokeResponseUrl(s.responses[tab.id]);
    delete s.responses[tab.id];
  }
  for (const nodeId of Object.keys(w.nodes)) delete s.collapsed[nodeId];
}

export const createRegistrySlice: SliceCreator<RegistrySlice> = (set, get) => {
  const first = createWorkspaceData(crypto.randomUUID(), "My workspace");

  const replaceContents = (id: string, build: (w: Workspace) => Workspace) => {
    const existing = get().workspaces[id];
    if (!existing) return;
    for (const tab of existing.tabs) get().abortRequest(tab.id);

    set((s) => {
      const target = s.workspaces[id];
      if (!target) return;
      clearRuntime(s, target);
      s.workspaces[id] = build(target);
      if (s.activeWorkspaceId === id) s.selectedNodeId = null;
    });
  };

  return {
    activeWorkspaceId: first.id,

    createEndpoint: (wsId, { name, definition }) => {
      const id = crypto.randomUUID();
      set((s) => {
        const w = requireWs(s, wsId);
        w.endpoints[id] = {
          createdAt: Date.now(),
          definition: normalizeDraft(definition),
          id,
          name: name?.trim() || defaultEndpointName(definition),
        };
      });
      return id;
    },

    createWorkspace: (name) => {
      const id = crypto.randomUUID();
      set((s) => {
        s.workspaces[id] = createWorkspaceData(
          id,
          clean(name, "Untitled workspace"),
        );
        s.activeWorkspaceId = id;
        s.selectedNodeId = null;
      });
      return id;
    },

    deleteEndpoint: (wsId, id) => {
      const w = get().workspaces[wsId];
      if (!w?.endpoints[id]) return;

      const tabIds = w.tabs.filter((t) => t.endpointId === id).map((t) => t.id);
      for (const tabId of tabIds) get().abortRequest(tabId);

      set((s) => {
        const target = s.workspaces[wsId];
        if (!target) return;
        for (const tabId of tabIds) dropTab(s, target, tabId);
        delete target.endpoints[id];
      });
    },

    deleteWorkspace: (id) => {
      const { workspaces } = get();
      const target = workspaces[id];
      if (!target || Object.keys(workspaces).length <= 1) return false;

      for (const tab of target.tabs) get().abortRequest(tab.id);

      set((s) => {
        const w = s.workspaces[id];
        if (!w) return;
        clearRuntime(s, w);
        delete s.workspaces[id];

        if (s.activeWorkspaceId === id) {
          const next = Object.values(s.workspaces).sort(
            (a, b) => a.createdAt - b.createdAt,
          )[0];
          if (next) s.activeWorkspaceId = next.id;
          s.selectedNodeId = null;
        }
      });
      return true;
    },

    loadDemoData: (id) =>
      replaceContents(id, (w) =>
        createDemoWorkspace(w.id, w.name, w.createdAt),
      ),

    renameEndpoint: (wsId, id, name) =>
      set((s) => {
        const endpoint = s.workspaces[wsId]?.endpoints[id];
        const trimmed = name.trim();
        if (endpoint && trimmed) endpoint.name = trimmed;
      }),

    renameWorkspace: (id, name) =>
      set((s) => {
        const w = s.workspaces[id];
        const trimmed = name.trim();
        if (w && trimmed) w.name = trimmed;
      }),

    resetWorkspace: (id) =>
      replaceContents(id, (w) =>
        createWorkspaceData(w.id, w.name, w.createdAt),
      ),

    setActiveWorkspace: (id) =>
      set((s) => {
        if (!s.workspaces[id] || s.activeWorkspaceId === id) return;
        s.activeWorkspaceId = id;
        s.selectedNodeId = null;
      }),
    workspaces: { [first.id]: first },
  };
};
