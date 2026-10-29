import type { Edge, EdgeTypes } from "@xyflow/react";
import { hierarchy, tree } from "d3-hierarchy";
import type { AppNode } from "../nodes";

export const edgeTypes = {} satisfies EdgeTypes;

type StoredNode = {
  id?: string;
  parentId?: string | null;
  endpointId?: string;
  requestSnapshot?: {
    method?: string;
    url?: string;
  };
  outcome?: {
    status?: number;
    state?: string;
  };
};

type StoreNodes = Record<string, StoredNode>;

type LayoutItem = {
  id: string;
  record: StoredNode | null;
  children: LayoutItem[];
};

const NODE_WIDTH = 220;
const NODE_HEIGHT = 70;

const HORIZONTAL_GAP = 100;
const VERTICAL_GAP = 80;
const PADDING = 40;

export function constructGraph(
  storeNodes: StoreNodes,
  positionOverrides: Record<string, { x: number; y: number }> = {},
): {
  nodes: AppNode[];
  edges: Edge[];
} {
  const records = Object.entries(storeNodes)
    .map(([key, record]) => ({
      id: record.id ?? key,
      record,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  if (records.length === 0) {
    return { edges: [], nodes: [] };
  }

  const ids = new Set(records.map(({ id }) => id));

  const parentById = new Map<string, string | undefined>();

  for (const { id, record } of records) {
    const parentId = record.parentId;

    parentById.set(
      id,
      parentId && parentId !== id && ids.has(parentId) ? parentId : undefined,
    );
  }

  const visitState = new Map<string, number>();

  function breakCycles(id: string): void {
    const state = visitState.get(id) ?? 0;

    if (state === 2 || state === 1) return;

    visitState.set(id, 1);

    const parentId = parentById.get(id);

    if (parentId) {
      if (visitState.get(parentId) === 1) {
        parentById.set(id, undefined);
      } else {
        breakCycles(parentId);
      }
    }

    visitState.set(id, 2);
  }

  for (const { id } of records) {
    breakCycles(id);
  }

  const items = new Map<string, LayoutItem>();

  for (const { id, record } of records) {
    items.set(id, {
      children: [],
      id,
      record,
    });
  }

  const roots: LayoutItem[] = [];

  for (const { id } of records) {
    const item = items.get(id)!;
    const parentId = parentById.get(id);

    if (parentId) {
      items.get(parentId)?.children.push(item);
    } else {
      roots.push(item);
    }
  }

  const hierarchyRoot = hierarchy<LayoutItem>(
    {
      children: roots,
      id: "__layout_root__",
      record: null,
    },
    (item) => item.children,
  );

  const layoutRoot = tree<LayoutItem>()
    .nodeSize([NODE_WIDTH + HORIZONTAL_GAP, NODE_HEIGHT + VERTICAL_GAP])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.25))(hierarchyRoot);

  const positionedNodes = layoutRoot
    .descendants()
    .filter((node) => node.data.record !== null);

  const minX = Math.min(...positionedNodes.map((node) => node.x));

  const minY = Math.min(...positionedNodes.map((node) => node.y));

  const nodes: AppNode[] = positionedNodes.map((node) => {
    const { id, record } = node.data;
    const value = record!;

    const label = [
      value.requestSnapshot?.method,
      value.requestSnapshot?.url ?? value.endpointId ?? id,
    ]
      .filter(Boolean)
      .join(" ");

    return {
      data: { label },
      id,
      position: positionOverrides[id] ?? {
        x: node.x - minX + PADDING,
        y: node.y - minY + PADDING,
      },
      type: "api",
    };
  });

  const edges: Edge[] = records.flatMap(({ id }): Edge[] => {
    const source = parentById.get(id);
    if (!source) return [];
    return [
      {
        id: `${source}->${id}`,
        source, // parent
        sourceHandle: "bottom", // parent's bottom
        target: id, // child
        targetHandle: "top", // child's top
        type: "smoothstep",
      },
    ];
  });

  return { edges, nodes };
}
