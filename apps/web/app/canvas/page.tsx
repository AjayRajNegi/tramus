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
import { Network, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
      {/* Flow canvas */}
      <section className="mt-12 h-[calc(100%-50px)] min-h-0 min-w-0 flex-1 p-4">
        <div className="h-full w-full overflow-hidden rounded-xl border border-border bg-background">
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
            onNodeDragStop={(_, node) =>
              setNodePosition(node.id, node.position)
            }
            onNodesChange={onNodesChange}
            onNodesDelete={onNodesDelete}
          >
            <Background />
            <MiniMap />
            <Controls />
          </ReactFlow>
        </div>
      </section>
      {/* Endpoints sidebar */}
      <aside className="mt-[50px] flex h-[calc(100%-50px)] w-80 shrink-0 flex-col overflow-hidden border-border border-l bg-background">
        <Card className="flex h-full flex-col gap-0 overflow-hidden rounded-none border-0 bg-transparent py-0 shadow-none">
          <CardHeader className="gap-1 border-border border-b px-4 py-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm tracking-tight">
                Endpoints
              </h2>

              <span className="rounded-md bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs tabular-nums">
                {Object.keys(drafts).length}
              </span>
            </div>

            <p className="text-muted-foreground text-xs">
              Add endpoints to your flow.
            </p>
          </CardHeader>

          <CardContent className="flex-1 space-y-2 overflow-y-auto p-3">
            {Object.entries(drafts).map(([key, record]) => (
              <div className="group flex flex-row-reverse" key={key}>
                <div className="min-w-0 flex-1 space-y-2 rounded-lg border-[0.5px] border-border bg-card p-3 transition-colors hover:border-ring/40 hover:bg-accent/50">
                  <span
                    className={`inline-flex rounded-md px-2 py-1 font-semibold text-[10px] leading-none ${
                      record.draft.method === "GET"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : record.draft.method === "POST"
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          : record.draft.method === "DELETE"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-primary/10 text-primary"
                    }`}
                  >
                    {record.draft.method}
                  </span>

                  <p className="break-all font-mono text-foreground text-xs leading-relaxed">
                    {record.draft.url}
                  </p>
                </div>

                <Tooltip>
                  <TooltipTrigger
                    delay={0}
                    render={
                      <Button
                        aria-label="Add endpoint to canvas"
                        className="border-[0.5px] border-border border-r-0 bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        onClick={() => addEndpoint(key, record.draft)}
                        size="icon"
                        variant="outline"
                      >
                        <Plus className="size-4" />
                      </Button>
                    }
                  />
                  <TooltipContent side="left">
                    <p>Add to canvas</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            ))}

            {Object.keys(drafts).length === 0 && (
              <p className="py-8 text-center text-muted-foreground text-xs">
                No endpoints available.
              </p>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
