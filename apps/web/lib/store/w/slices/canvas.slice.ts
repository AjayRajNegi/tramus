import { getAncestry } from "../graph";
import { createNode, removeNodeIn, requireWs, resolveNodeIn } from "../ops";
import type { CanvasSlice, SliceCreator } from "../types";

export const createCanvasSlice: SliceCreator<CanvasSlice> = (set, get) => ({
  addNode: (wsId, input) => {
    const id = { value: "" };
    set((s) => {
      const w = requireWs(s, wsId);
      // always detached: the user connects it manually
      id.value = createNode(w, w.activeScenarioId, null, input);
      if (s.activeWorkspaceId === wsId) s.selectedNodeId = id.value;
    });
    return id.value;
  },
  collapsed: {},

  removeNode: (wsId, id) =>
    set((s) => {
      const w = s.workspaces[wsId];
      if (!w) return;
      removeNodeIn(w, id);
      delete s.collapsed[id];
      if (s.selectedNodeId === id) s.selectedNodeId = null;
    }),

  resolveNode: (wsId, id, outcome) =>
    set((s) => resolveNodeIn(s.workspaces[wsId], id, outcome)),
  selectedNodeId: null,

  selectNode: (id) => set({ selectedNodeId: id }),

  setNodePosition: (wsId, id, pos) =>
    set((s) => {
      const w = s.workspaces[wsId];
      if (!w) return;
      if (pos) w.positionOverrides[id] = pos;
      else delete w.positionOverrides[id];
    }),

  setParent: (wsId, childId, parentId) => {
    const nodes = get().workspaces[wsId]?.nodes;
    if (!nodes?.[childId]) return false;

    if (parentId !== null) {
      if (parentId === childId || !nodes[parentId]) return false;
      // reject cycles: the child must not be an ancestor of the new parent
      if (getAncestry(nodes, parentId).includes(childId)) return false;
    }

    set((s) => {
      const child = s.workspaces[wsId]?.nodes[childId];
      if (child) child.parentId = parentId;
    });
    return true;
  },

  toggleCollapsed: (id) =>
    set((s) => {
      if (s.collapsed[id]) delete s.collapsed[id];
      else s.collapsed[id] = true;
    }),
});
