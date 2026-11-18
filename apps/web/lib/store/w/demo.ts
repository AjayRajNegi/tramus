import { makeDraft, outcomeFromStatus } from "./helpers";
import { createWorkspaceData, MAIN_SCENARIO_ID, openTabIn } from "./ops";
import type {
  NodeId,
  NodeOutcome,
  ScenarioId,
  Workspace,
  WorkspaceId,
} from "./types";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export function createDemoWorkspace(
  id: WorkspaceId,
  name: string,
  createdAt = Date.now(),
): Workspace {
  console.log("workspaceId", id);
  const w = createWorkspaceData(id, name, createdAt);
  const { endpoints, nodes, scenarios } = w;
  let clock = Date.UTC(2026, 9, 26, 9, 0, 0);

  const addScenario = (
    sid: ScenarioId,
    scenarioName: string,
    forkedFromNodeId: NodeId,
  ) => {
    scenarios[sid] = {
      archived: false,
      createdAt: clock,
      forkedFromNodeId,
      headNodeId: forkedFromNodeId,
      id: sid,
      name: scenarioName,
    };
  };

  const add = (
    nodeId: NodeId,
    scenarioId: ScenarioId,
    endpointId: string,
    method: Method,
    path: string,
    outcome: NodeOutcome,
    opts: { json?: string; replayOf?: NodeId } = {},
  ) => {
    const sc = scenarios[scenarioId];
    if (!sc) throw new Error(`Unknown scenario: ${scenarioId}`);

    clock += 1500;
    endpoints[endpointId] ??= {
      createdAt: clock,
      definition: makeDraft(method, path, opts.json),
      id: endpointId,
      name: `${method} ${path}`,
    };
    nodes[nodeId] = {
      createdAt: clock,
      endpointId,
      id: nodeId,
      outcome,
      parentId: sc.headNodeId,
      replayOf: opts.replayOf,
      requestId: `req_${nodeId}`,
      requestSnapshot: makeDraft(method, path, opts.json),
      scenarioId,
    };
    sc.headNodeId = nodeId;
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

  // A tab per scenario; the last one opened (main) ends up active.
  openTabIn(w, "ep_pay_get", "sc_failure");
  openTabIn(w, "ep_pay", M);

  return w;
}
