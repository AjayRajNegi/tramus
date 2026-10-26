import type { Edge, EdgeTypes } from "@xyflow/react";
import type { AppNode } from "../nodes";

export const initialEdges = [
  { animated: true, id: "a->c", source: "a", target: "c" },
  { id: "b->d", source: "b", target: "d" },
  { animated: true, id: "c->d", source: "c", target: "d" },
] satisfies Edge[];

export const edgeTypes = {
  // Add your custom edge types here!
} satisfies EdgeTypes;

type StoredNode = {
  id?: string;
  parentId?: string | null;
  endpointId?: string;
  requestSnapshot?: {
    url?: string;
    method?: string;
  };
};

type StoredNodes = Record<string, StoredNode>;

type ConstructedGraph = {
  nodes: AppNode[];
  edges: Edge[];
};

export function constructGraph(storeNodes: StoredNodes): ConstructedGraph {
  // Use each stored node's ID, falling back to its record key.
  const records = Object.entries(storeNodes)
    .map(([key, value]) => ({
      id: value.id ?? key,
      value,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const byId = new Map<string, StoredNode>(
    records.map(({ id, value }) => [id, value]),
  );

  // Count children so we can distinguish intermediate and leaf nodes.
  const childCount = new Map<string, number>();

  for (const { value } of records) {
    const parentId = value.parentId;

    if (parentId && byId.has(parentId)) {
      childCount.set(parentId, (childCount.get(parentId) ?? 0) + 1);
    }
  }

  // Calculate each node's depth in the parent-child hierarchy.
  const depthCache = new Map<string, number>();

  function getDepth(id: string, visiting = new Set<string>()): number {
    const cached = depthCache.get(id);

    if (cached !== undefined) return cached;
    if (visiting.has(id)) return 0; // Avoid infinite recursion.

    visiting.add(id);

    const parentId = byId.get(id)?.parentId;
    const depth =
      parentId && byId.has(parentId) ? getDepth(parentId, visiting) + 1 : 0;

    visiting.delete(id);
    depthCache.set(id, depth);

    return depth;
  }

  // Keep positions deterministic instead of using Math.random().
  const rowsPerDepth = new Map<number, number>();

  const nodes: AppNode[] = records.map(({ id, value }) => {
    const depth = getDepth(id);
    const row = rowsPerDepth.get(depth) ?? 0;

    rowsPerDepth.set(depth, row + 1);

    const hasParent = Boolean(value.parentId) && byId.has(value.parentId!);

    const hasChildren = (childCount.get(id) ?? 0) > 0;

    // Root nodes have source handles, leaves have target handles,
    // and intermediate nodes can connect in both directions.
    const type: "input" | "default" | "output" = !hasParent
      ? "input"
      : !hasChildren
        ? "output"
        : "default";

    const endpoint = value.requestSnapshot?.url ?? value.endpointId ?? id;

    const label = [value.requestSnapshot?.method, endpoint]
      .filter(Boolean)
      .join(" ");

    return {
      data: { label },
      id,
      position: {
        x: depth * 280,
        y: row * 140,
      },
      type,
    };
  });

  // Every edge points from the parent to its child.
  const edges: Edge[] = records.flatMap(({ id, value }) => {
    const source = value.parentId;

    // Ignore missing parents and self-referencing relationships.
    if (!source || source === id || !byId.has(source)) {
      return [];
    }

    return [
      {
        id: `${source}->${id}`,
        source,
        target: id,
      },
    ];
  });

  return { edges, nodes };
}
