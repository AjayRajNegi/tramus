import type { NodeId, ScenarioId, TimelineNode, Workspace } from "./types";

type Nodes = Record<NodeId, TimelineNode>;

export const ROOT_KEY = "__root__";

const childrenCache = new WeakMap<Nodes, Record<string, NodeId[]>>();

export function getChildrenIndex(nodes: Nodes): Record<string, NodeId[]> {
  const cached = childrenCache.get(nodes);
  if (cached) return cached;

  const index: Record<string, NodeId[]> = {};
  for (const n of Object.values(nodes)) {
    const key = n.parentId ?? ROOT_KEY;
    const list = index[key] ?? [];
    list.push(n.id);
    index[key] = list;
  }
  for (const list of Object.values(index)) {
    list.sort(
      (a, b) => (nodes[a]?.createdAt ?? 0) - (nodes[b]?.createdAt ?? 0),
    );
  }
  childrenCache.set(nodes, index);
  return index;
}

export const getRootIds = (nodes: Nodes): NodeId[] =>
  getChildrenIndex(nodes)[ROOT_KEY] ?? [];

export function getAncestry(nodes: Nodes, id: NodeId): NodeId[] {
  const path: NodeId[] = [];
  const seen = new Set<NodeId>();
  let cur: NodeId | null = id;
  while (cur && !seen.has(cur)) {
    const node: TimelineNode | undefined = nodes[cur];
    if (!node) break;
    seen.add(cur);
    path.push(cur);
    cur = node.parentId;
  }
  return path.reverse();
}

export function getScenarioHistory(
  w: Pick<Workspace, "nodes" | "scenarios">,
  scenarioId: ScenarioId,
): NodeId[] {
  const head = w.scenarios[scenarioId]?.headNodeId;
  return head ? getAncestry(w.nodes, head) : [];
}

export function getBranchPointIds(nodes: Nodes): NodeId[] {
  return Object.entries(getChildrenIndex(nodes))
    .filter(([key, kids]) => key !== ROOT_KEY && kids.length > 1)
    .map(([key]) => key);
}

export function getVisibleNodeIds(
  nodes: Nodes,
  collapsed: Record<NodeId, boolean>,
): NodeId[] {
  const index = getChildrenIndex(nodes);
  const out: NodeId[] = [];
  const stack = [...(index[ROOT_KEY] ?? [])].reverse();
  while (stack.length) {
    const id = stack.pop();
    if (id === undefined) break;
    out.push(id);
    if (collapsed[id]) continue;
    const kids = index[id] ?? [];
    for (let i = kids.length - 1; i >= 0; i--) {
      const kid = kids[i];
      if (kid !== undefined) stack.push(kid);
    }
  }
  return out;
}
