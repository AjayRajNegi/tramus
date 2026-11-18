import { getChildrenIndex } from "./graph";
import { deepEqual } from "./helpers";
import type { ResponseState } from "./response.store.types";
import type {
  Scenario,
  Tab,
  TabId,
  TimelineNode,
  Workspace,
  WorkspaceId,
  WorkspaceStore,
} from "./types";
import { useWorkspaceStore } from "./workspace.store";

const IDLE: ResponseState = { phase: "idle" };
const NO_TABS: Tab[] = [];
const NO_NODES: Record<string, TimelineNode> = {};
const NO_SCENARIOS: Record<string, Scenario> = {};

type S = WorkspaceStore;

export const selectWorkspaces = (s: S) => s.workspaces;
export const selectActiveWorkspaceId = (s: S) => s.activeWorkspaceId;

//  TODO selectActiveWorkspace should be Workspace but defined as Workspace | undefined check if only Workspace works
export const selectActiveWorkspace = (s: S): Workspace =>
  s.workspaces[s.activeWorkspaceId];
export const selectWorkspace = (id: WorkspaceId) => (s: S) => s.workspaces[id];

export const listWorkspaces = (workspaces: Record<WorkspaceId, Workspace>) =>
  Object.values(workspaces).sort((a, b) => a.createdAt - b.createdAt);

export const selectEndpoints = (wsId: WorkspaceId) => (s: S) =>
  s.workspaces[wsId]?.endpoints;

export const selectScenarios = (wsId: WorkspaceId) => (s: S) =>
  s.workspaces[wsId]?.scenarios ?? NO_SCENARIOS;

export const selectActiveScenario = (wsId: WorkspaceId) => (s: S) => {
  const w = s.workspaces[wsId];
  return w?.scenarios[w.activeScenarioId];
};

export const selectNodes = (wsId: WorkspaceId) => (s: S) =>
  s.workspaces[wsId]?.nodes ?? NO_NODES;

export const selectTabs = (wsId: WorkspaceId) => (s: S) =>
  s.workspaces[wsId]?.tabs ?? NO_TABS;

export const selectActiveTab = (wsId: WorkspaceId) => (s: S) => {
  const w = s.workspaces[wsId];
  return w?.tabs.find((t) => t.id === w.activeTabId);
};

export const selectDraft = (wsId: WorkspaceId, tabId: TabId) => (s: S) =>
  s.workspaces[wsId]?.drafts[tabId]?.draft;

export const selectDraftStatus = (wsId: WorkspaceId, tabId: TabId) => (s: S) =>
  s.workspaces[wsId]?.drafts[tabId]?.status ?? "idle";

export const selectIsDirty = (wsId: WorkspaceId, tabId: TabId) => (s: S) => {
  const entry = s.workspaces[wsId]?.drafts[tabId];
  return entry ? !deepEqual(entry.draft, entry.baseline) : false;
};

export const selectResponseState = (tabId: TabId) => (s: S) =>
  s.responses[tabId] ?? IDLE;

export const selectIsSending = (tabId: TabId) => (s: S) =>
  s.responses[tabId]?.phase === "loading";

export const useChildrenIndex = (wsId: WorkspaceId) =>
  useWorkspaceStore((s) =>
    getChildrenIndex(s.workspaces[wsId]?.nodes ?? NO_NODES),
  );

export const useActiveScenario = (wsId: WorkspaceId) =>
  useWorkspaceStore(selectActiveScenario(wsId));
