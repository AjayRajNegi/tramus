import type { Draft } from "immer";
import type { StateCreator } from "zustand";
import type {
  HttpResponse,
  RequestFailure,
  ResponseState,
} from "./response.store.types";
import type { DraftEntry, EndpointDraft } from "./tab.store.types";
// Your existing request/response types stay where they are. Adjust these paths.

/* -------------------------------------------------------------------------- */
/* IDs                                                                        */
/* -------------------------------------------------------------------------- */

export type WorkspaceId = string;
export type EndpointId = string;
export type ScenarioId = string;
export type NodeId = string;
export type TabId = string;

export type Point = { x: number; y: number };

/* -------------------------------------------------------------------------- */
/* Domain                                                                     */
/* -------------------------------------------------------------------------- */

export type Endpoint = {
  id: EndpointId;
  name: string;
  /** Last saved definition. New tabs start from it and diff against it. */
  definition: EndpointDraft;
  createdAt: number;
};

export type NodeOutcome =
  | { state: "pending" }
  | { state: "success"; status: number; durationMs: number }
  | { state: "failure"; status: number; durationMs: number }
  | { state: "error"; message: string };

export type TimelineNode = {
  id: NodeId;
  /** `null` = root (or detached until the user connects it). */
  parentId: NodeId | null;
  /**
   * The scenario that *created* this node. Forks share nodes instead of
   * copying them, so this is provenance, not membership. A scenario's history
   * is the ancestry of its `headNodeId`.
   */
  scenarioId: ScenarioId;
  endpointId: EndpointId;
  requestId: string;
  createdAt: number;
  /** Draft at send time, with file contents stripped. */
  requestSnapshot: EndpointDraft;
  outcome: NodeOutcome;
  replayOf?: NodeId;
};

export type Scenario = {
  id: ScenarioId;
  name: string;
  forkedFromNodeId: NodeId | null;
  headNodeId: NodeId | null;
  archived: boolean;
  createdAt: number;
};

export type Tab = {
  id: TabId;
  endpointId: EndpointId;
  /** Requests sent from this tab are recorded in this scenario. */
  scenarioId: ScenarioId;
  /** Most recent node sent from this tab. Used as the fork point. */
  lastNodeId: NodeId | null;
};

export type Workspace = {
  id: WorkspaceId;
  name: string;
  createdAt: number;

  endpoints: Record<EndpointId, Endpoint>;

  // canvas / history
  scenarios: Record<ScenarioId, Scenario>;
  nodes: Record<NodeId, TimelineNode>;
  /** Scenario the canvas is focused on. Follows the active tab. */
  activeScenarioId: ScenarioId;
  positionOverrides: Record<NodeId, Point>;

  // editor
  tabs: Tab[];
  activeTabId: TabId | null;
  drafts: Record<TabId, DraftEntry>;
};

export type RecordRequestInput = {
  endpointId: EndpointId;
  requestId: string;
  snapshot: EndpointDraft;
  replayOf?: NodeId;
};

export type DraftSeed = { draft: EndpointDraft; baseline?: EndpointDraft };

export type ForkSource = { nodeId: NodeId } | { tabId: TabId };
export type ForkResult = { scenarioId: ScenarioId; tabId: TabId | null };

/* -------------------------------------------------------------------------- */
/* Slices                                                                     */
/* -------------------------------------------------------------------------- */

export type RegistrySlice = {
  workspaces: Record<WorkspaceId, Workspace>;
  activeWorkspaceId: WorkspaceId;

  createWorkspace: (name: string) => WorkspaceId;
  renameWorkspace: (id: WorkspaceId, name: string) => void;
  /** Returns false if it is unknown or the last remaining workspace. */
  deleteWorkspace: (id: WorkspaceId) => boolean;
  setActiveWorkspace: (id: WorkspaceId) => void;
  resetWorkspace: (id: WorkspaceId) => void;
  loadDemoData: (id: WorkspaceId) => void;

  createEndpoint: (
    wsId: WorkspaceId,
    input: { name?: string; definition: EndpointDraft },
  ) => EndpointId;
  renameEndpoint: (wsId: WorkspaceId, id: EndpointId, name: string) => void;
  /** Closes the endpoint's tabs. Timeline nodes keep their snapshots. */
  deleteEndpoint: (wsId: WorkspaceId, id: EndpointId) => void;
};

export type ScenarioSlice = {
  /**
   * Fork from a node or a tab. No nodes are copied: the new scenario points at
   * the existing node and grows from there. By default a tab is opened in the
   * new scenario (seeded from the tab's draft, or the node's request snapshot).
   */
  fork: (
    wsId: WorkspaceId,
    from: ForkSource,
    name: string,
    opts?: { openTab?: boolean },
  ) => ForkResult;
  switchScenario: (wsId: WorkspaceId, id: ScenarioId) => void;
  renameScenario: (wsId: WorkspaceId, id: ScenarioId, name: string) => void;
  archiveScenario: (wsId: WorkspaceId, id: ScenarioId) => void;
  restoreScenario: (wsId: WorkspaceId, id: ScenarioId) => void;
};

export type CanvasSlice = {
  // ephemeral UI (not persisted)
  selectedNodeId: NodeId | null;
  collapsed: Record<NodeId, boolean>;

  /** Adds a detached node (no parent, scenario head untouched). */
  addNode: (wsId: WorkspaceId, input: RecordRequestInput) => NodeId;
  /** Removes a node; its children are re-attached to its parent. */
  removeNode: (wsId: WorkspaceId, id: NodeId) => void;
  setParent: (
    wsId: WorkspaceId,
    childId: NodeId,
    parentId: NodeId | null,
  ) => boolean;
  resolveNode: (wsId: WorkspaceId, id: NodeId, outcome: NodeOutcome) => void;

  selectNode: (id: NodeId | null) => void;
  toggleCollapsed: (id: NodeId) => void;
  setNodePosition: (wsId: WorkspaceId, id: NodeId, pos: Point | null) => void;
};

export type EditorSlice = {
  /** Reuses the existing tab for the same endpoint + scenario. */
  openTab: (
    wsId: WorkspaceId,
    input: { endpointId: EndpointId; scenarioId?: ScenarioId },
  ) => TabId | null;
  closeTab: (wsId: WorkspaceId, tabId: TabId) => void;
  setActiveTab: (wsId: WorkspaceId, tabId: TabId | null) => void;

  updateDraft: (
    wsId: WorkspaceId,
    tabId: TabId,
    recipe: (draft: Draft<EndpointDraft>) => void,
  ) => void;
  /** Discards changes (back to baseline), or re-bases on `base`. */
  resetDraft: (wsId: WorkspaceId, tabId: TabId, base?: EndpointDraft) => void;
  setStatus: (
    wsId: WorkspaceId,
    tabId: TabId,
    status: DraftEntry["status"],
    error?: string,
  ) => void;
  /** Sets baseline + endpoint definition to `saved` (defaults to the draft). */
  markSaved: (wsId: WorkspaceId, tabId: TabId, saved?: EndpointDraft) => void;
};

export type RequestHandle = {
  requestId: string;
  nodeId: NodeId;
  signal: AbortSignal;
};

export type RequestSlice = {
  // ephemeral (not persisted), keyed by tab
  responses: Record<TabId, ResponseState>;

  /**
   * One atomic step: records a pending node in the tab's scenario, advances
   * the scenario head, and flips the tab to "loading". Pass `signal` to fetch
   * and set `response.id` / `failure.id` to `requestId`.
   */
  beginRequest: (
    wsId: WorkspaceId,
    tabId: TabId,
    opts?: { replayOf?: NodeId },
  ) => RequestHandle;
  completeRequest: (tabId: TabId, response: HttpResponse) => void;
  failRequest: (tabId: TabId, failure: RequestFailure) => void;
  abortRequest: (tabId: TabId) => void;
  clearResponse: (tabId: TabId) => void;
};

export type WorkspaceStore = RegistrySlice &
  ScenarioSlice &
  CanvasSlice &
  EditorSlice &
  RequestSlice;

export type PersistedState = Pick<
  WorkspaceStore,
  "workspaces" | "activeWorkspaceId"
>;

export type SliceCreator<T> = StateCreator<
  WorkspaceStore,
  [["zustand/persist", unknown], ["zustand/immer", never]],
  [],
  T
>;
