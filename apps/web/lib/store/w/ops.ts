import {
  normalizeDraft,
  revokeResponseUrl,
  stripFileContents,
} from "./helpers";
import type {
  DraftSeed,
  EndpointId,
  NodeId,
  NodeOutcome,
  RecordRequestInput,
  ScenarioId,
  Tab,
  TabId,
  Workspace,
  WorkspaceId,
  WorkspaceStore,
} from "./types";

export const MAIN_SCENARIO_ID = "main";
export const MAX_SCENARIOS = 20;

export function createWorkspaceData(
  id: WorkspaceId,
  name: string,
  createdAt = Date.now(),
): Workspace {
  return {
    activeScenarioId: MAIN_SCENARIO_ID,
    activeTabId: null,
    createdAt,
    drafts: {},
    endpoints: {},
    id,
    name,
    nodes: {},
    positionOverrides: {},
    scenarios: {
      [MAIN_SCENARIO_ID]: {
        archived: false,
        createdAt,
        forkedFromNodeId: null,
        headNodeId: null,
        id: MAIN_SCENARIO_ID,
        name: "main",
      },
    },
    tabs: [],
  };
}

export function requireWs(s: WorkspaceStore, id: WorkspaceId): Workspace {
  const w = s.workspaces[id];
  if (!w) throw new Error(`Unknown workspace: ${id}`);
  return w;
}

export function createNode(
  w: Workspace,
  scenarioId: ScenarioId,
  parentId: NodeId | null,
  input: RecordRequestInput,
): NodeId {
  const id = crypto.randomUUID();
  w.nodes[id] = {
    createdAt: Date.now(),
    endpointId: input.endpointId,
    id,
    outcome: { state: "pending" },
    parentId,
    replayOf: input.replayOf,
    requestId: input.requestId,
    requestSnapshot: stripFileContents(input.snapshot),
    scenarioId,
  };
  return id;
}

export function resolveNodeIn(
  w: Workspace | undefined,
  id: NodeId,
  outcome: NodeOutcome,
): void {
  const node = w?.nodes[id];
  if (node?.outcome.state !== "pending") return;
  node.outcome = outcome;
}

export function removeNodeIn(w: Workspace, id: NodeId): void {
  const removed = w.nodes[id];
  if (!removed) return;
  const fallback = removed.parentId;

  delete w.nodes[id];
  for (const n of Object.values(w.nodes)) {
    if (n.parentId === id) n.parentId = fallback;
    if (n.replayOf === id) n.replayOf = undefined;
  }
  for (const sc of Object.values(w.scenarios)) {
    if (sc.headNodeId === id) sc.headNodeId = fallback;
    if (sc.forkedFromNodeId === id) sc.forkedFromNodeId = fallback;
  }
  for (const t of w.tabs) {
    if (t.lastNodeId === id) t.lastNodeId = fallback;
  }
  delete w.positionOverrides[id];
}

export function failPendingNodes(w: Workspace): void {
  for (const n of Object.values(w.nodes)) {
    if (n.outcome.state === "pending") {
      n.outcome = {
        message: "Interrupted before a response was received",
        state: "error",
      };
    }
  }
}

export function openTabIn(
  w: Workspace,
  endpointId: EndpointId,
  scenarioId: ScenarioId,
  seed?: DraftSeed,
): TabId | null {
  const endpoint = w.endpoints[endpointId];
  if (!endpoint || !w.scenarios[scenarioId]) return null;

  const existing = w.tabs.find(
    (t) => t.endpointId === endpointId && t.scenarioId === scenarioId,
  );
  if (existing) {
    w.activeTabId = existing.id;
    w.activeScenarioId = scenarioId;
    return existing.id;
  }

  const id = crypto.randomUUID();
  const tab: Tab = { endpointId, id, lastNodeId: null, scenarioId };

  w.tabs.push(tab);
  w.drafts[id] = {
    baseline: normalizeDraft(seed?.baseline ?? endpoint.definition),
    draft: normalizeDraft(seed?.draft ?? endpoint.definition),
    status: "idle",
  };
  w.activeTabId = id;
  w.activeScenarioId = scenarioId;
  return id;
}

export function dropTab(s: WorkspaceStore, w: Workspace, tabId: TabId): void {
  const index = w.tabs.findIndex((t) => t.id === tabId);
  if (index === -1) return;

  w.tabs.splice(index, 1);
  delete w.drafts[tabId];
  revokeResponseUrl(s.responses[tabId]);
  delete s.responses[tabId];

  if (w.activeTabId === tabId) {
    const next = w.tabs[index] ?? w.tabs[index - 1];
    w.activeTabId = next?.id ?? null;
    if (next) w.activeScenarioId = next.scenarioId;
  }
}

export function tabHeadNodeId(w: Workspace, tab: Tab): NodeId | null {
  if (tab.lastNodeId && w.nodes[tab.lastNodeId]) return tab.lastNodeId;
  return w.scenarios[tab.scenarioId]?.headNodeId ?? null;
}
