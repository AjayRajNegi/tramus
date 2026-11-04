import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { failPendingNodes } from "./ops";
import { createCanvasSlice } from "./slices/canvas.slice";
import { createEditorSlice } from "./slices/editor.slice";
import { createRegistrySlice } from "./slices/registry.slice";
import { createRequestSlice } from "./slices/request.slice";
import { createScenarioSlice } from "./slices/scenario.slice";
import { createWorkspaceStorage } from "./storage";
import type { PersistedState, WorkspaceStore } from "./types";

export { MAIN_SCENARIO_ID, MAX_SCENARIOS } from "./ops";

/**
 * One store, five slices. Every cross-cutting operation (fork, send, close
 * tab, delete workspace...) happens inside a single `set`, so canvas and
 * editor can't drift apart.
 *
 * Persisted: workspaces + activeWorkspaceId.
 * Not persisted: responses, selectedNodeId, collapsed.
 */
export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    immer((...a) => ({
      ...createRegistrySlice(...a),
      ...createScenarioSlice(...a),
      ...createCanvasSlice(...a),
      ...createEditorSlice(...a),
      ...createRequestSlice(...a),
    })),
    {
      merge: (persisted, current) => {
        const p = persisted as Partial<PersistedState> | undefined;
        const workspaces = p?.workspaces;
        if (!workspaces || Object.keys(workspaces).length === 0) return current;

        for (const w of Object.values(workspaces)) failPendingNodes(w);

        const activeWorkspaceId =
          p?.activeWorkspaceId && workspaces[p.activeWorkspaceId]
            ? p.activeWorkspaceId
            : (Object.keys(workspaces)[0] ?? current.activeWorkspaceId);

        return { ...current, activeWorkspaceId, workspaces };
      },
      migrate: (persisted, _version) => persisted as PersistedState,
      name: "tramus-workspaces",
      partialize: (s): PersistedState => ({
        activeWorkspaceId: s.activeWorkspaceId,
        workspaces: s.workspaces,
      }),
      storage: createWorkspaceStorage<PersistedState>(),
      version: 1,
    },
  ),
);
