"use client";

import {
  addEdge,
  Background,
  type Connection,
  ConnectionMode,
  Controls,
  type Edge,
  Handle,
  MiniMap,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useEditorState } from "@/lib/store/editor.store";

export type ApiNodeData = { label: string };
export type ApiNode = Node<ApiNodeData, "api">;

export function ApiNodeComponent({ data }: NodeProps<ApiNode>) {
  return (
    <div className="rounded border bg-background px-4 py-2 text-sm">
      <Handle id="top" position={Position.Top} type="source" />
      {data.label}
      <Handle id="bottom" position={Position.Bottom} type="source" />
    </div>
  );
}

export const nodeTypes = { api: ApiNodeComponent };

const initialNodes: ApiNode[] = [
  {
    data: { label: "Node 1", parentId: null },
    id: "n1",
    position: { x: 0, y: 0 },
    type: "api",
  },
  {
    data: { label: "Node 2", parentId: null },
    id: "n2",
    position: { x: 0, y: 150 },
    type: "api",
  },
];
const initialEdges: Edge[] = [];

export default function Demo() {
  const [nodes, setNodes, onNodesChange] = useNodesState<ApiNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
  const { drafts } = useEditorState();

  const onConnect = useCallback(
    (connection: Connection) => {
      const { source, target, sourceHandle } = connection;

      if (source === target) {
        return;
      }

      const childId = sourceHandle === "top" ? source : target;
      const parentId = sourceHandle === "top" ? target : source;

      setNodes((nds) =>
        nds.map((n) =>
          n.id === childId ? { ...n, data: { ...n.data, parentId } } : n,
        ),
      );
      setEdges((eds) => addEdge(connection, eds));
    },
    [setNodes, setEdges],
  );

  const addNewNode = useCallback(
    (label: string) => {
      const id = `n${Date.now()}`;
      setNodes((nds) => [
        ...nds,
        {
          data: { label, parentId: null },
          id,
          position: { x: 100 + nds.length * 20, y: 50 + nds.length * 20 },
          type: "api",
        },
      ]);
    },
    [setNodes],
  );

  return (
    <main style={{ display: "flex", height: "100vh", width: "100%" }}>
      <div
        className="m-4 rounded-2xl border"
        style={{ height: "calc(100% - 32px)", width: "60%" }}
      >
        <ReactFlow
          connectionMode={ConnectionMode.Loose}
          edges={edges}
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
      </div>

      <div className="flex flex-col gap-2 p-4">
        {Object.entries(drafts).map(([key, record]) => (
          <div className="rounded-xl bg-blue-400 p-4 text-sm" key={key}>
            <p>{record.draft.url}</p>
            <Button onClick={() => addNewNode(record.draft.url)}>
              Add this node to canvas
            </Button>
          </div>
        ))}
      </div>
    </main>
  );
}
