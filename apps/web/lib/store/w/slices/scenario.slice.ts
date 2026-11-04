import {
  MAIN_SCENARIO_ID,
  MAX_SCENARIOS,
  openTabIn,
  requireWs,
  tabHeadNodeId,
} from "../ops";
import type {
  DraftSeed,
  EndpointId,
  ForkResult,
  NodeId,
  ScenarioSlice,
  SliceCreator,
} from "../types";

export const createScenarioSlice: SliceCreator<ScenarioSlice> = (set) => ({
  archiveScenario: (wsId, id) =>
    set((s) => {
      const w = s.workspaces[wsId];
      const sc = w?.scenarios[id];
      if (!w || !sc || id === MAIN_SCENARIO_ID) return;

      sc.archived = true;
      if (w.activeScenarioId === id) {
        w.activeScenarioId = MAIN_SCENARIO_ID;
        if (s.activeWorkspaceId === wsId) {
          s.selectedNodeId = w.scenarios[MAIN_SCENARIO_ID]?.headNodeId ?? null;
        }
      }
    }),
  fork: (wsId, from, name, opts) => {
    const scenarioId = crypto.randomUUID();
    const result: ForkResult = { scenarioId, tabId: null };

    set((s) => {
      const w = requireWs(s, wsId);

      const trimmed = name.trim();
      if (!trimmed) throw new Error("Scenario name is required");

      const live = Object.values(w.scenarios).filter((sc) => !sc.archived);
      if (live.length >= MAX_SCENARIOS) {
        throw new Error(`Scenario limit reached (${MAX_SCENARIOS})`);
      }

      let forkNodeId: NodeId | null;
      let endpointId: EndpointId;
      let seed: DraftSeed;

      if ("tabId" in from) {
        const tab = w.tabs.find((t) => t.id === from.tabId);
        const entry = w.drafts[from.tabId];
        if (!tab || !entry) throw new Error(`Unknown tab: ${from.tabId}`);

        forkNodeId = tabHeadNodeId(w, tab);
        endpointId = tab.endpointId;
        seed = { baseline: entry.baseline, draft: entry.draft };
      } else {
        const node = w.nodes[from.nodeId];
        if (!node) throw new Error(`Unknown node: ${from.nodeId}`);

        forkNodeId = node.id;
        endpointId = node.endpointId;
        seed = { draft: node.requestSnapshot };
      }

      // No node copying: the scenario simply points at the existing node.
      w.scenarios[scenarioId] = {
        archived: false,
        createdAt: Date.now(),
        forkedFromNodeId: forkNodeId,
        headNodeId: forkNodeId,
        id: scenarioId,
        name: trimmed,
      };
      w.activeScenarioId = scenarioId;
      if (s.activeWorkspaceId === wsId) s.selectedNodeId = forkNodeId;

      if (opts?.openTab !== false) {
        result.tabId = openTabIn(w, endpointId, scenarioId, seed);
      }
    });

    return result;
  },

  renameScenario: (wsId, id, name) =>
    set((s) => {
      const sc = s.workspaces[wsId]?.scenarios[id];
      const trimmed = name.trim();
      if (sc && trimmed) sc.name = trimmed;
    }),

  restoreScenario: (wsId, id) =>
    set((s) => {
      const w = s.workspaces[wsId];
      const sc = w?.scenarios[id];
      if (!w || !sc || !sc.archived) return;

      const live = Object.values(w.scenarios).filter((x) => !x.archived);
      if (live.length >= MAX_SCENARIOS) {
        throw new Error(`Scenario limit reached (${MAX_SCENARIOS})`);
      }
      sc.archived = false;
    }),

  switchScenario: (wsId, id) =>
    set((s) => {
      const w = s.workspaces[wsId];
      const sc = w?.scenarios[id];
      if (!w || !sc) return;

      w.activeScenarioId = id;
      if (s.activeWorkspaceId === wsId) s.selectedNodeId = sc.headNodeId;

      // keep the editor in step with the canvas when possible
      const active = w.tabs.find((t) => t.id === w.activeTabId);
      if (active?.scenarioId !== id) {
        const candidate = w.tabs.find((t) => t.scenarioId === id);
        if (candidate) w.activeTabId = candidate.id;
      }
    }),
});
