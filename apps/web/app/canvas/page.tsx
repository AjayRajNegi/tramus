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
import { useCallback, useEffect, useMemo } from "react";

import "@xyflow/react/dist/style.css";
import { constructGraph, edgeTypes } from "@/lib/helper/canvas/edges";
import { nodeTypes } from "@/lib/helper/canvas/nodes";
import { makeDraft, useCanvasStore } from "@/lib/store/canvas.store";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { useEditorState } from "@/lib/store/editor.store";

export default function App() {
  const storeNodes = useCanvasStore((s) => s.nodes);
  const recordRequest = useCanvasStore((s) => s.recordRequest);

  const { nodes: newNodes, edges: newEdges } = useMemo(
    () => constructGraph(storeNodes),
    [storeNodes],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(newNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(newEdges);

  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((edges) => addEdge(connection, edges)),
    [setEdges],
  );

  useEffect(() => {
    setNodes(newNodes);
    setEdges(newEdges);
  }, [newNodes, newEdges, setNodes, setEdges]);

  function addNewNode() {
    const draft = makeDraft("POST", "www.google.com", `"name" : "Ajay"`);
    recordRequest({
      endpointId: `end${Date.now()}`,
      requestId: `req${Date.now()}`,
      snapshot: draft,
      workspaceId: `work${Date.now()}`,
    });
  }

  console.log(storeNodes);

  const { drafts } = useEditorState();
  Object.entries(drafts).map(([key, record]) => console.log(record));

  return (
    <main style={{ display: "flex", height: "100%", width: "100%" }}>
      <div
        className="m-4 rounded-2xl border"
        style={{ height: "calc(100% - 32px)", width: "60%" }}
      >
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
      </div>

      <div>
        {Object.entries(drafts).map(([key, record]) => (
          <div className="rounded-xl bg-blue-400 p-4 text-sm" key={key}>
            <p>{record.draft.url}</p>
            <Button
              onClick={() =>
                recordRequest({
                  endpointId: `end${Date.now()}`,
                  requestId: `req${Date.now()}`,
                  snapshot: makeDraft(
                    record.draft.method,
                    record.draft.url,
                    record.draft.body.json
                      ? record.draft.body.json
                      : `"name" : "Ajay"`,
                  ),
                  workspaceId: `work${Date.now()}`,
                })
              }
            >
              Add this node to canvas
            </Button>
          </div>
        ))}

        <Button onClick={addNewNode}>Add new node</Button>
      </div>
    </main>
  );
}
