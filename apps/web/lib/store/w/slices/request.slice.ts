import { outcomeFromStatus, revokeBody, revokeResponseUrl } from "../helpers";
import { createNode, resolveNodeIn } from "../ops";
import type {
  NodeId,
  RequestSlice,
  SliceCreator,
  TabId,
  WorkspaceId,
} from "../types";

/**
 * Runtime-only bookkeeping (AbortControllers can't live in the store).
 * Source of truth for "is this request still current?".
 */
type InFlight = {
  requestId: string;
  nodeId: NodeId;
  wsId: WorkspaceId;
  controller: AbortController;
};

const inFlight = new Map<TabId, InFlight>();

/** Removes and returns the entry only if it matches `requestId`. */
function takeFlight(tabId: TabId, requestId: string): InFlight | undefined {
  const flight = inFlight.get(tabId);
  if (!flight || flight.requestId !== requestId) return undefined;
  inFlight.delete(tabId);
  return flight;
}

export const createRequestSlice: SliceCreator<RequestSlice> = (set) => ({
  abortRequest: (tabId) => {
    const flight = inFlight.get(tabId);
    if (!flight) return;
    inFlight.delete(tabId);
    flight.controller.abort();

    set((s) => {
      const cur = s.responses[tabId];
      if (cur?.phase === "loading") {
        const now = Date.now();
        s.responses[tabId] = {
          failure: {
            code: "aborted",
            duration: now - cur.startedAt,
            id: flight.requestId,
            message: "Request aborted",
            occurredAt: now,
          },
          phase: "error",
        };
      }
      resolveNodeIn(s.workspaces[flight.wsId], flight.nodeId, {
        message: "Request aborted",
        state: "error",
      });
    });
  },

  beginRequest: (wsId, tabId, opts) => {
    const requestId = crypto.randomUUID();
    const controller = new AbortController();
    const previous = inFlight.get(tabId);
    const created = { nodeId: "" };

    set((s) => {
      const w = s.workspaces[wsId];
      const tab = w?.tabs.find((t) => t.id === tabId);
      const entry = w?.drafts[tabId];
      if (!w || !tab || !entry) throw new Error(`Unknown tab: ${tabId}`);

      const scenario = w.scenarios[tab.scenarioId];
      if (!scenario) throw new Error(`Unknown scenario: ${tab.scenarioId}`);
      if (scenario.archived) {
        throw new Error(
          `Scenario "${scenario.name}" is archived and read-only`,
        );
      }

      if (previous) {
        resolveNodeIn(w, previous.nodeId, {
          message: "Superseded by a newer request",
          state: "error",
        });
      }
      revokeResponseUrl(s.responses[tabId]);

      const nodeId = createNode(w, scenario.id, scenario.headNodeId, {
        endpointId: tab.endpointId,
        replayOf: opts?.replayOf,
        requestId,
        snapshot: entry.draft,
      });
      scenario.headNodeId = nodeId;
      tab.lastNodeId = nodeId;
      created.nodeId = nodeId;

      if (s.activeWorkspaceId === wsId) s.selectedNodeId = nodeId;
      s.responses[tabId] = {
        phase: "loading",
        requestId,
        startedAt: Date.now(),
      };
    });

    // only after the update succeeded, so a throw leaves the old request alone
    previous?.controller.abort();
    inFlight.set(tabId, {
      controller,
      nodeId: created.nodeId,
      requestId,
      wsId,
    });

    return { nodeId: created.nodeId, requestId, signal: controller.signal };
  },

  clearResponse: (tabId) =>
    set((s) => {
      revokeResponseUrl(s.responses[tabId]);
      delete s.responses[tabId];
    }),

  completeRequest: (tabId, response) => {
    const flight = takeFlight(tabId, response.id);
    if (!flight) {
      revokeBody(response.body); // stale: nobody will ever render it
      return;
    }
    set((s) => {
      s.responses[tabId] = { phase: "success", response };
      resolveNodeIn(
        s.workspaces[flight.wsId],
        flight.nodeId,
        outcomeFromStatus(response.status, response.timing.total),
      );
    });
  },

  failRequest: (tabId, failure) => {
    const flight = takeFlight(tabId, failure.id);
    if (!flight) return;
    set((s) => {
      s.responses[tabId] = { failure, phase: "error" };
      resolveNodeIn(s.workspaces[flight.wsId], flight.nodeId, {
        message: failure.message,
        state: "error",
      });
    });
  },

  responses: {},
});
