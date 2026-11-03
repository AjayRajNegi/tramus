import { del as idbDel, get as idbGet, set as idbSet } from "idb-keyval";
import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { EndpointDraft } from "./tab.store.types";

const SEED_DUMMY_DATA = false;

export const MAIN_SCENARIO_ID = "main";
export const MAX_SCENARIOS = 20;
const ROOT_KEY = "__root__";

export type NodeId = string;
export type ScenarioId = string;

export type NodeOutcome =
  | { state: "pending" }
  | { state: "success"; status: number; durationMs: number }
  | { state: "failure"; status: number; durationMs: number }
  | { state: "error"; message: string };

export type TimelineNode = {
  id: NodeId;
  parentId: NodeId | null;
  scenarioId: ScenarioId;
  workspaceId: string;
  endpointId: string;
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
};

export type CanvasData = {
  nodes: Record<NodeId, TimelineNode>;
  scenarios: Record<ScenarioId, Scenario>;
  activeScenarioId: ScenarioId;
};

type CanvasUiState = {
  selectedNodeId: NodeId | null;
  collapsed: Record<NodeId, boolean>;
  positionOverrides: Record<NodeId, { x: number; y: number }>;
};

export type RecordRequestInput = {
  endpointId: string;
  workspaceId: string;
  requestId: string;
  snapshot: EndpointDraft;
  replayOf?: NodeId;
};

type CanvasActions = {
  recordRequest: (input: RecordRequestInput) => NodeId;
  resolveNode: (id: NodeId, outcome: NodeOutcome) => void;

  fork: (fromNodeId: NodeId, name: string) => ScenarioId;
  switchScenario: (id: ScenarioId) => void;
  renameScenario: (id: ScenarioId, name: string) => void;
  archiveScenario: (id: ScenarioId) => void;

  selectNode: (id: NodeId | null) => void;
  toggleCollapsed: (id: NodeId) => void;
  setNodePosition: (id: NodeId, pos: { x: number; y: number } | null) => void;

  loadDummyData: () => void;
  reset: () => void;

  addNode: (input: RecordRequestInput) => NodeId;
  setParent: (childId: NodeId, parentId: NodeId | null) => boolean;
  removeNode: (id: NodeId) => void;
};

export type CanvasState = CanvasData & CanvasUiState & CanvasActions;

// Persisted Memory

const memory = new Map<string, string>();

const memoryStorage: StateStorage = {
  getItem: (name) => memory.get(name) ?? null,
  removeItem: (name) => void memory.delete(name),
  setItem: (name, value) => void memory.set(name, value),
};

const idbStorage: StateStorage = {
  getItem: async (name) => (await idbGet<string>(name)) ?? null,
  removeItem: async (name) => idbDel(name),
  setItem: async (name, value) => idbSet(name, value),
};

// Store
const initialData = (): CanvasData =>
  SEED_DUMMY_DATA ? createDummyData() : createEmptyData();

export const useCanvasStore = create<CanvasState>()(
  persist(
    immer((set, get) => ({
      ...initialData(),

      addNode: ({ endpointId, workspaceId, requestId, snapshot, replayOf }) => {
        const id = crypto.randomUUID();
        set((s) => {
          s.nodes[id] = {
            createdAt: Date.now(),
            endpointId,
            id,
            outcome: { state: "pending" },
            parentId: null, // always unattached; user connects it manually
            replayOf,
            requestId,
            requestSnapshot: snapshot,
            scenarioId: s.activeScenarioId,
            workspaceId,
          };
          s.selectedNodeId = id;
        });
        return id;
      },

      archiveScenario: (id) =>
        set((s) => {
          if (id === MAIN_SCENARIO_ID || !s.scenarios[id]) return;
          s.scenarios[id].archived = true;
          if (s.activeScenarioId === id) {
            s.activeScenarioId = MAIN_SCENARIO_ID;
            s.selectedNodeId = s.scenarios[MAIN_SCENARIO_ID].headNodeId;
          }
        }),
      collapsed: {},

      fork: (fromNodeId, name) => {
        const { nodes, scenarios, positionOverrides } = get();
        if (!nodes[fromNodeId]) throw new Error(`Unknown node: ${fromNodeId}`);
        if (Object.keys(scenarios).length >= MAX_SCENARIOS) {
          throw new Error(`Scenario limit reached (${MAX_SCENARIOS})`);
        }
        const trimmed = name.trim();
        if (!trimmed) throw new Error("Scenario name is required");

        const chain: TimelineNode[] = [];
        const seen = new Set<string>();
        let cur: TimelineNode | undefined = nodes[fromNodeId];
        while (cur && !seen.has(cur.id)) {
          seen.add(cur.id);
          chain.unshift(cur);
          cur = cur.parentId ? nodes[cur.parentId] : undefined;
        }

        const scenarioId = crypto.randomUUID();
        const idMap = new Map<string, string>();
        for (const n of chain) idMap.set(n.id, crypto.randomUUID());

        set((s) => {
          for (const old of chain) {
            // biome-ignore lint/style/noNonNullAssertion: suppress
            const newId = idMap.get(old.id)!;
            s.nodes[newId] = {
              ...old,
              id: newId,
              parentId: old.parentId ? (idMap.get(old.parentId) ?? null) : null,
              scenarioId,
            };
            const pos = positionOverrides[old.id];
            if (pos) s.positionOverrides[newId] = { ...pos };
          }
          s.scenarios[scenarioId] = {
            archived: false,
            forkedFromNodeId: fromNodeId,
            // biome-ignore lint/style/noNonNullAssertion: suppress
            headNodeId: idMap.get(fromNodeId)!,
            id: scenarioId,
            name: trimmed,
          };
          s.activeScenarioId = scenarioId;
          // biome-ignore lint/style/noNonNullAssertion: suppress
          s.selectedNodeId = idMap.get(fromNodeId)!;
        });
        return scenarioId;
      },

      loadDummyData: () =>
        set({
          ...createDummyData(),
          collapsed: {},
          positionOverrides: {},
          selectedNodeId: null,
        }),
      positionOverrides: {},

      recordRequest: ({
        endpointId,
        workspaceId,
        requestId,
        snapshot,
        replayOf,
      }) => {
        const { scenarios, activeScenarioId } = get();
        const sc = scenarios[activeScenarioId];
        if (!sc) throw new Error(`Unknown scenario: ${activeScenarioId}`);
        if (sc.archived) {
          throw new Error(`Scenario "${sc.name}" is archived and read-only`);
        }

        const id = crypto.randomUUID();
        set((s) => {
          const scenario = s.scenarios[s.activeScenarioId];
          s.nodes[id] = {
            createdAt: Date.now(),
            endpointId,
            id,
            outcome: { state: "pending" },
            parentId: scenario.headNodeId,
            replayOf,
            requestId,
            requestSnapshot: snapshot,
            scenarioId: scenario.id,
            workspaceId,
          };
          scenario.headNodeId = id;
          s.selectedNodeId = id;
        });
        return id;
      },

      removeNode: (id) =>
        set((s) => {
          const removed = s.nodes[id];
          if (!removed) return;
          const fallback = removed.parentId;
          delete s.nodes[id];
          for (const n of Object.values(s.nodes)) {
            if (n.parentId === id) n.parentId = null; // orphan the children
          }
          for (const sc of Object.values(s.scenarios)) {
            if (sc.headNodeId === id) sc.headNodeId = fallback;
            if (sc.forkedFromNodeId === id) sc.forkedFromNodeId = fallback;
          }
          delete s.positionOverrides[id];
          delete s.collapsed[id];
          if (s.selectedNodeId === id) s.selectedNodeId = null;
        }),

      renameScenario: (id, name) =>
        set((s) => {
          const trimmed = name.trim();
          if (s.scenarios[id] && trimmed) s.scenarios[id].name = trimmed;
        }),

      reset: () =>
        set({
          ...createEmptyData(),
          collapsed: {},
          positionOverrides: {},
          selectedNodeId: null,
        }),

      resolveNode: (id, outcome) =>
        set((s) => {
          const node = s.nodes[id];
          if (node?.outcome.state !== "pending") return;
          node.outcome = outcome;
        }),

      selectedNodeId: null,

      selectNode: (id) => set({ selectedNodeId: id }),

      setNodePosition: (id, pos) =>
        set((s) => {
          if (pos) s.positionOverrides[id] = pos;
          else delete s.positionOverrides[id];
        }),

      setParent: (childId, parentId) => {
        const { nodes } = get();
        if (!nodes[childId]) return false;
        if (parentId !== null) {
          if (parentId === childId || !nodes[parentId]) return false;
          // reject cycles: child must not be an ancestor of the new parent
          if (getAncestry(nodes, parentId).includes(childId)) return false;
        }
        set((s) => {
          s.nodes[childId].parentId = parentId;
        });
        return true;
      },

      switchScenario: (id) =>
        set((s) => {
          const sc = s.scenarios[id];
          if (!sc) return;
          s.activeScenarioId = id;
          s.selectedNodeId = sc.headNodeId;
        }),

      toggleCollapsed: (id) =>
        set((s) => {
          if (s.collapsed[id]) delete s.collapsed[id];
          else s.collapsed[id] = true;
        }),
    })),
    {
      migrate: (persisted, _version) => persisted as CanvasData,
      name: "tramus-canvas",
      partialize: (s) => ({
        activeScenarioId: s.activeScenarioId,
        nodes: s.nodes,
        positionOverrides: s.positionOverrides,
        scenarios: s.scenarios,
      }),
      storage: createJSONStorage(() =>
        typeof indexedDB !== "undefined" ? idbStorage : memoryStorage,
      ),
      version: 1,
    },
  ),
);

// Helpers

export function outcomeFromStatus(
  status: number,
  durationMs: number,
): NodeOutcome {
  return status < 400
    ? { durationMs, state: "success", status }
    : { durationMs, state: "failure", status };
}

export function stripFileContents(draft: EndpointDraft): EndpointDraft {
  const copy = structuredClone(draft);
  if (copy.body.file) copy.body.file.base64 = "";
  for (const row of copy.body.formData) {
    for (const f of row.files) f.base64 = "";
  }
  return copy;
}

const childrenCache = new WeakMap<
  Record<NodeId, TimelineNode>,
  Record<string, NodeId[]>
>();

export function getChildrenIndex(
  nodes: Record<NodeId, TimelineNode>,
): Record<string, NodeId[]> {
  const cached = childrenCache.get(nodes);
  if (cached) return cached;

  const index: Record<string, NodeId[]> = {};
  for (const n of Object.values(nodes)) {
    // biome-ignore lint/suspicious/noAssignInExpressions: suppress
    (index[n.parentId ?? ROOT_KEY] ??= []).push(n.id);
  }
  for (const key of Object.keys(index)) {
    index[key].sort((a, b) => nodes[a].createdAt - nodes[b].createdAt);
  }
  childrenCache.set(nodes, index);
  return index;
}

export function getRootIds(nodes: Record<NodeId, TimelineNode>): NodeId[] {
  return getChildrenIndex(nodes)[ROOT_KEY] ?? [];
}

export function getAncestry(
  nodes: Record<NodeId, TimelineNode>,
  id: NodeId,
): NodeId[] {
  const path: NodeId[] = [];
  for (let cur: NodeId | null = id; cur; cur = nodes[cur]?.parentId ?? null) {
    path.push(cur);
  }
  return path.reverse();
}

export function getScenarioHistory(
  data: Pick<CanvasData, "nodes" | "scenarios">,
  scenarioId: ScenarioId,
): NodeId[] {
  const head = data.scenarios[scenarioId]?.headNodeId;
  return head ? getAncestry(data.nodes, head) : [];
}

export function getBranchPointIds(
  nodes: Record<NodeId, TimelineNode>,
): NodeId[] {
  const index = getChildrenIndex(nodes);
  return Object.entries(index)
    .filter(([key, kids]) => key !== ROOT_KEY && kids.length > 1)
    .map(([key]) => key);
}

export function getVisibleNodeIds(
  nodes: Record<NodeId, TimelineNode>,
  collapsed: Record<NodeId, boolean>,
): NodeId[] {
  const index = getChildrenIndex(nodes);
  const out: NodeId[] = [];
  const stack = [...(index[ROOT_KEY] ?? [])].reverse();
  while (stack.length) {
    // biome-ignore lint/style/noNonNullAssertion: suppress
    const id = stack.pop()!;
    out.push(id);
    if (collapsed[id]) continue;
    const kids = index[id] ?? [];
    for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i]);
  }
  return out;
}

export function makeDraft(
  method: EndpointDraft["method"],
  path: string,
  json = "",
): EndpointDraft {
  return {
    authorization: { password: "", token: "", type: "none", username: "" },
    body: {
      file: null,
      form: [],
      formData: [],
      json,
      raw: "",
      type: json ? "json" : "none",
    },
    headers: [],
    method,
    params: [],
    path,
    // url: `http://localhost:3000${path}`,
    url: path,
  };
}

export function createEmptyData(): CanvasData {
  return {
    activeScenarioId: MAIN_SCENARIO_ID,
    nodes: {},
    scenarios: {
      [MAIN_SCENARIO_ID]: {
        archived: false,
        forkedFromNodeId: null,
        headNodeId: null,
        id: MAIN_SCENARIO_ID,
        name: "main",
      },
    },
  };
}

export function createDummyData(): CanvasData {
  const workspaceId = "ws_demo";
  const data = createEmptyData();
  const { nodes, scenarios } = data;
  let clock = Date.UTC(2026, 9, 26, 9, 0, 0);

  const addScenario = (
    id: ScenarioId,
    name: string,
    forkedFromNodeId: NodeId,
  ) => {
    scenarios[id] = {
      archived: false,
      forkedFromNodeId,
      headNodeId: forkedFromNodeId,
      id,
      name,
    };
  };

  const add = (
    id: NodeId,
    scenarioId: ScenarioId,
    endpointId: string,
    method: EndpointDraft["method"],
    path: string,
    outcome: NodeOutcome,
    opts: { json?: string; replayOf?: NodeId } = {},
  ) => {
    const sc = scenarios[scenarioId];
    nodes[id] = {
      // biome-ignore lint/suspicious/noAssignInExpressions: suppress
      createdAt: (clock += 1500),
      endpointId,
      id,
      outcome,
      parentId: sc.headNodeId,
      replayOf: opts.replayOf,
      requestId: `req_${id}`,
      requestSnapshot: makeDraft(method, path, opts.json),
      scenarioId,
      workspaceId,
    };
    sc.headNodeId = id;
  };

  const M = MAIN_SCENARIO_ID;

  add("n_login", M, "ep_login", "POST", "/login", outcomeFromStatus(200, 120), {
    json: '{"user":"demo","pass":"demo"}',
  });
  add("n_me", M, "ep_me", "GET", "/me", outcomeFromStatus(200, 45));
  add("n_pay", M, "ep_pay", "POST", "/payments", outcomeFromStatus(201, 310), {
    json: '{"amount":4999,"currency":"USD"}',
  });

  addScenario("sc_success", "payment-success", "n_pay");
  addScenario("sc_failure", "payment-failure", "n_pay");
  addScenario("sc_expired", "expired-token", "n_me");

  add("n_orders", M, "ep_orders", "GET", "/orders", outcomeFromStatus(200, 80));

  add(
    "n_me_401",
    "sc_expired",
    "ep_me",
    "GET",
    "/me",
    outcomeFromStatus(401, 38),
  );
  add(
    "n_refresh",
    "sc_expired",
    "ep_refresh",
    "POST",
    "/auth/refresh",
    outcomeFromStatus(200, 95),
  );

  add(
    "n_get_ok",
    "sc_success",
    "ep_pay_get",
    "GET",
    "/payments/:id",
    outcomeFromStatus(200, 60),
  );
  add(
    "n_receipt_ok",
    "sc_success",
    "ep_receipt",
    "POST",
    "/receipts",
    outcomeFromStatus(201, 140),
  );

  add(
    "n_get_500",
    "sc_failure",
    "ep_pay_get",
    "GET",
    "/payments/:id",
    outcomeFromStatus(500, 210),
    { replayOf: "n_get_ok" },
  );
  add(
    "n_receipt_timeout",
    "sc_failure",
    "ep_receipt",
    "POST",
    "/receipts",
    { message: "Request timed out after 30000ms", state: "error" },
    { replayOf: "n_receipt_ok" },
  );
  add("n_retry", "sc_failure", "ep_pay", "POST", "/payments/retry", {
    state: "pending",
  });

  return data;
}

export const useChildrenIndex = () =>
  useCanvasStore((s) => getChildrenIndex(s.nodes));

export const useActiveScenario = () =>
  useCanvasStore((s) => s.scenarios[s.activeScenarioId]);
