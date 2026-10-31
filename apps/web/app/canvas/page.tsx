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
import { FolderOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
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
  const activeScenarioId = useCanvasStore((s) => s.activeScenarioId);
  const positionOverrides = useCanvasStore((s) => s.positionOverrides);
  const addNode = useCanvasStore((s) => s.addNode);
  const setParent = useCanvasStore((s) => s.setParent);
  const removeNode = useCanvasStore((s) => s.removeNode);
  const setNodePosition = useCanvasStore((s) => s.setNodePosition);
  const fork = useCanvasStore((s) => s.fork);

  const { drafts } = useEditorState();

  const scenarioNodes = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(storeNodes).filter(
          ([, n]) => n.scenarioId === activeScenarioId,
        ),
      ),
    [storeNodes, activeScenarioId],
  );

  const graph = useMemo(
    () => constructGraph(scenarioNodes, positionOverrides),
    [scenarioNodes, positionOverrides],
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

  const forkNode = (nodeId: string) => fork(nodeId, "forked");

  const switchScenario = useCanvasStore((s) => s.switchScenario);
  const scenarios = useCanvasStore((s) => s.scenarios);

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
            key={activeScenarioId}
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
            {/* <MiniMap className="bg-background" /> */}
            {/* <Controls className="bg-background text-foreground" /> */}
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
            {Object.entries(scenarios).map(([key, scenario]) => (
              <div
                className="flex items-center justify-between rounded-[2px] border p-1 pl-2"
                key={scenario.id}
              >
                <h3>{scenario.name}</h3>
                <Button
                  className=""
                  onClick={() => switchScenario(scenario.id)}
                  variant="outline"
                >
                  Switch
                </Button>

                {/* <p>ID: {scenario.id}</p>
                <p>Key: {key}</p>
                <p>Forked From: {scenario.forkedFromNodeId ?? "None"}</p>
                <p>Head Node: {scenario.headNodeId ?? "None"}</p>
                <p>Archived: {scenario.archived ? "Yes" : "No"}</p> */}
              </div>
            ))}
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-2">
            {Object.keys(drafts).length > 0 && (
              <div>
                {/* Level 1: Workspace */}
                <div className="flex items-center gap-3 px-2 py-2">
                  <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium text-foreground text-sm">
                    {WORKSPACE_ID}
                  </span>
                </div>

                {/* Level 2: Endpoints (indented with a guide line) */}
                <div className="ml-4 space-y-0.5 border-border border-l pl-2">
                  {Object.entries(drafts).map(([key, record]) => (
                    <div
                      className="group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/50"
                      key={key}
                    >
                      <span
                        className={`shrink-0 font-semibold text-xs leading-none ${
                          record.draft.method === "GET"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : record.draft.method === "POST"
                              ? "text-amber-700 dark:text-amber-400"
                              : record.draft.method === "DELETE"
                                ? "text-destructive"
                                : "text-primary"
                        }`}
                      >
                        {record.draft.method}
                      </span>

                      <span
                        className="min-w-0 flex-1 truncate text-muted-foreground text-sm group-hover:text-foreground"
                        title={record.draft.url}
                      >
                        {record.draft.url}
                      </span>

                      <Tooltip>
                        <TooltipTrigger
                          delay={0}
                          render={
                            <Button
                              aria-label="Add endpoint to canvas"
                              className="h-6 w-6 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-accent-foreground focus-visible:opacity-100 group-hover:opacity-100"
                              onClick={() => addEndpoint(key, record.draft)}
                              size="icon"
                              variant="ghost"
                            >
                              <Plus className="size-3.5" />
                            </Button>
                          }
                        />
                        <TooltipContent side="left">
                          <p>Add to canvas</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(drafts).length === 0 && (
              <p className="py-8 text-center text-muted-foreground text-xs">
                No endpoints available.
              </p>
            )}
          </CardContent>
          <CardFooter className="flex flex-col p-0">
            {nodes.map((node) => (
              <div className="flex w-full text-left" key={node.id}>
                <Button onClick={() => forkNode(node.id)}>
                  <Plus className="size-3.5" />
                </Button>
                <Button className="w-full" variant="secondary">
                  {node.data.label}
                </Button>
              </div>
            ))}
          </CardFooter>
        </Card>
      </aside>
    </div>
  );
}
