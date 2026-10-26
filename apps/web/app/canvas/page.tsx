"use client";

import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  type OnConnect,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { useCallback, useMemo } from "react";

import "@xyflow/react/dist/style.css";
import { constructGraph, edgeTypes } from "@/lib/helper/canvas/edges";
import { nodeTypes } from "@/lib/helper/canvas/nodes";
import { useCanvasStore } from "@/lib/store/canvas.store";

export default function App() {
  const { nodes: storeNodes } = useCanvasStore();
  const { nodes: newNodes, edges: newEdges } = useMemo(
    () => constructGraph(storeNodes),
    [storeNodes],
  );
  const [nodes, , onNodesChange] = useNodesState(newNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(newEdges);

  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((edges) => addEdge(connection, edges)),
    [setEdges],
  );

  return (
    <ReactFlow
      edges={edges}
      edgeTypes={edgeTypes}
      fitView
      nodes={nodes}
      nodeTypes={nodeTypes}
      onConnect={onConnect}
      onEdgesChange={onEdgesChange}
      onNodesChange={onNodesChange}
    >
      <Background />
      <MiniMap />
      <Controls />
    </ReactFlow>
  );
}
