"use client";

import {
  Background,
  type Connection,
  ConnectionMode,
  Controls,
  type Edge,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo } from "react";

import "@xyflow/react/dist/style.css";
import { constructGraph } from "@/lib/helper/canvas/edges";
import {
  getAncestry,
  stripFileContents,
  useCanvasStore,
} from "@/lib/store/canvas.store";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { useEditorState } from "@/lib/store/editor.store";
import type { EndpointDraft } from "@/lib/store/tab.store.types";
import { nodeTypes } from "./demo/page";

const WORKSPACE_ID = "default";

function resolveLink(c: Connection) {
  const { source, target, sourceHandle, targetHandle } = c;
  if (source === target) return null;
  if (sourceHandle === "bottom" && targetHandle === "top")
    return { childId: target, parentId: source };
  if (sourceHandle === "top" && targetHandle === "bottom")
    return { childId: source, parentId: target };
  return null;
}

export default function Canvas() {
  const storeNodes = useCanvasStore((s) => s.nodes);
  const positionOverrides = useCanvasStore((s) => s.positionOverrides);
  const addNode = useCanvasStore((s) => s.addNode);
  const setParent = useCanvasStore((s) => s.setParent);
  const removeNode = useCanvasStore((s) => s.removeNode);
  const setNodePosition = useCanvasStore((s) => s.setNodePosition);

  const { drafts } = useEditorState();

  const graph = useMemo(
    () => constructGraph(storeNodes, positionOverrides),
    [storeNodes, positionOverrides],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(graph.edges);

  useEffect(() => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [graph, setNodes, setEdges]);

  const isValidConnection = useCallback((c: Connection | Edge) => {
    const link = resolveLink(c as Connection);
    if (!link) return false;
    const { nodes } = useCanvasStore.getState();
    return !getAncestry(nodes, link.parentId).includes(link.childId); // no cycles
  }, []);

  const onConnect = useCallback(
    (c: Connection) => {
      const link = resolveLink(c);
      if (link) setParent(link.childId, link.parentId);
    },
    [setParent],
  );

  const onEdgesDelete = useCallback(
    // biome-ignore lint/suspicious/useIterableCallbackReturn: Suppress
    (deleted: Edge[]) => deleted.forEach((e) => setParent(e.target, null)),
    [setParent],
  );

  const onNodesDelete = useCallback(
    // biome-ignore lint/suspicious/useIterableCallbackReturn: Suppress
    (deleted: { id: string }[]) => deleted.forEach((n) => removeNode(n.id)),
    [removeNode],
  );

  const addEndpoint = (endpointId: string, draft: EndpointDraft) =>
    addNode({
      endpointId,
      requestId: crypto.randomUUID(),
      snapshot: stripFileContents(draft),
      workspaceId: WORKSPACE_ID,
    });

  return (
    <main style={{ display: "flex", height: "100%", width: "100%" }}>
      <div
        className="m-4 rounded-2xl border"
        style={{ height: "calc(100% - 32px)", width: "60%" }}
      >
        <ReactFlow
          connectionMode={ConnectionMode.Loose}
          edges={edges}
          fitView
          isValidConnection={isValidConnection}
          nodes={nodes}
          nodeTypes={nodeTypes}
          onConnect={onConnect}
          onEdgesChange={onEdgesChange}
          onEdgesDelete={onEdgesDelete}
          onNodeDragStop={(_, node) => setNodePosition(node.id, node.position)}
          onNodesChange={onNodesChange}
          onNodesDelete={onNodesDelete}
        >
          <Background />
          <MiniMap />
          <Controls />
        </ReactFlow>
      </div>

      <div className="flex flex-col gap-2 p-4">
        {Object.entries(drafts).map(([key, record]) => (
          <div className="rounded-xl bg-blue-400 p-4 text-sm" key={key}>
            <p>
              {record.draft.method} {record.draft.url}
            </p>
            <Button onClick={() => addEndpoint(key, record.draft)}>
              Add this node to canvas
            </Button>
          </div>
        ))}
      </div>
    </main>
  );
}
