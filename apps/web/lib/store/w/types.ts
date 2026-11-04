import type { Draft } from "immer";
import type { StateCreator } from "zustand";
import type {
  HttpResponse,
  RequestFailure,
  ResponseState,
} from "./response.store.types";
import type { DraftEntry, EndpointDraft } from "./tab.store.types";

export type WorkspaceId = string;
export type EndpointId = string;
export type ScenarioId = string;
export type NodeId = string;
export type TabId = string;

export type Point = { x: number; y: number };

export type Endpoint = {
  id: EndpointId;
  name: string;
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
  parentId: NodeId | null;
  scenarioId: ScenarioId;
  endpointId: EndpointId;
  requestId: string;
  createdAt: number;
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
  scenarioId: ScenarioId;
  lastNodeId: NodeId | null;
};

export type Workspace = {
  id: WorkspaceId;
  name: string;
  createdAt: number;

  endpoints: Record<EndpointId, Endpoint>;
  scenarios: Record<ScenarioId, Scenario>;
  nodes: Record<NodeId, TimelineNode>;
  activeScenarioId: ScenarioId;
  positionOverrides: Record<NodeId, Point>;

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

export type RegistrySlice = {
  workspaces: Record<WorkspaceId, Workspace>;
  activeWorkspaceId: WorkspaceId;

  createWorkspace: (name: string) => WorkspaceId;
  renameWorkspace: (id: WorkspaceId, name: string) => void;
  deleteWorkspace: (id: WorkspaceId) => boolean;
  setActiveWorkspace: (id: WorkspaceId) => void;
  resetWorkspace: (id: WorkspaceId) => void;
  loadDemoData: (id: WorkspaceId) => void;

  createEndpoint: (
    wsId: WorkspaceId,
    input: { name?: string; definition: EndpointDraft },
  ) => EndpointId;
  renameEndpoint: (wsId: WorkspaceId, id: EndpointId, name: string) => void;
  deleteEndpoint: (wsId: WorkspaceId, id: EndpointId) => void;
};

export type ScenarioSlice = {
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
  selectedNodeId: NodeId | null;
  collapsed: Record<NodeId, boolean>;

  addNode: (wsId: WorkspaceId, input: RecordRequestInput) => NodeId;
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
  resetDraft: (wsId: WorkspaceId, tabId: TabId, base?: EndpointDraft) => void;
  setStatus: (
    wsId: WorkspaceId,
    tabId: TabId,
    status: DraftEntry["status"],
    error?: string,
  ) => void;
  markSaved: (wsId: WorkspaceId, tabId: TabId, saved?: EndpointDraft) => void;
};

export type RequestHandle = {
  requestId: string;
  nodeId: NodeId;
  signal: AbortSignal;
};

export type RequestSlice = {
  responses: Record<TabId, ResponseState>;

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
