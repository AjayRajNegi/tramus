"use client";

import {
  Background,
  type Connection,
  ConnectionMode,
  type Edge,
  Handle,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { ChevronRight, FolderOpen, GitBranch, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { constructGraph } from "@/lib/helper/canvas/edges";
import {
  getAncestry,
  stripFileContents,
  useCanvasStore,
} from "@/lib/store/canvas.store";
import { useEditorState } from "@/lib/store/editor.store";
import type { EndpointDraft } from "@/lib/store/tab.store.types";

const WORKSPACE_ID = "default-workspace";

function resolveLink(c: Connection) {
  const { source, target, sourceHandle, targetHandle } = c;
  if (source === target) return null;
  if (sourceHandle === "bottom" && targetHandle === "top")
    return { childId: target, parentId: source };
  if (sourceHandle === "top" && targetHandle === "bottom")
    return { childId: source, parentId: target };
  return null;
}

const METHOD_STYLE: Record<string, string> = {
  DELETE: "text-destructive",
  GET: "text-emerald-600 dark:text-emerald-400",
  PATCH: "text-violet-700 dark:text-violet-400",
  POST: "text-amber-700 dark:text-amber-400",
  PUT: "text-sky-700 dark:text-sky-400",
};

type ApiNodeData = { label: string };
type ApiNode = Node<ApiNodeData, "api">;

function ApiNodeComponent({ data }: NodeProps<ApiNode>) {
  return (
    <div className="rounded border bg-background px-4 py-2 text-sm">
      <Handle id="top" position={Position.Top} type="source" />
      {data.label}
      <Handle id="bottom" position={Position.Bottom} type="source" />
    </div>
  );
}

export const nodeTypes = { api: ApiNodeComponent };

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

  const forkNode = (nodeId: string, name: string) => fork(nodeId, name);

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
                Workspaces
              </h2>
              <span className="rounded-md bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs tabular-nums">
                {Object.keys(scenarios).length}
              </span>
            </div>
            <p className="text-muted-foreground text-xs">Choose a workspace.</p>
          </CardHeader>

          {/* Tree: workspace → scenarios → nodes of the active scenario */}
          <CardContent className="min-h-0 flex-1 overflow-y-auto p-2">
            {/* Level 1: Workspace */}
            <div className="flex h-9 items-center gap-2.5 px-2">
              <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate font-medium text-foreground text-sm">
                {WORKSPACE_ID}
              </span>
            </div>

            {/* Level 2: Scenarios */}
            <div className="ml-[15px] space-y-0.5 border-border/60 border-l">
              {Object.values(scenarios).map((scenario) => {
                const isActive = scenario.id === activeScenarioId;

                return (
                  <div key={scenario.id}>
                    <button
                      aria-current={isActive ? "true" : undefined}
                      className={`group relative flex h-8 w-full items-center gap-1 rounded-md pr-2 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                        isActive ? "bg-accent/40" : ""
                      } ${scenario.archived ? "opacity-60" : ""}`}
                      onClick={() => switchScenario(scenario.id)}
                      type="button"
                    >
                      {isActive && (
                        <span className="absolute left-0 h-full w-0.5 rounded-full bg-primary" />
                      )}
                      <ChevronRight
                        className={`ml-2 size-3.5 shrink-0 text-muted-foreground transition-transform duration-150 motion-reduce:transition-none ${
                          isActive ? "rotate-90" : ""
                        }`}
                      />
                      <span
                        className={`min-w-0 flex-1 truncate text-sm ${
                          isActive
                            ? "font-medium text-foreground"
                            : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      >
                        {scenario.name}
                      </span>
                      {scenario.archived && (
                        <span className="text-muted-foreground text-xs">
                          Archived
                        </span>
                      )}
                      {isActive && !scenario.archived && (
                        <span className="text-muted-foreground text-xs tabular-nums">
                          {nodes.length}
                        </span>
                      )}
                    </button>

                    {/* Level 3: Nodes on this scenario's canvas */}
                    {isActive && (
                      <div className="mt-0.5 mb-1 ml-4 space-y-0.5 border-border/60 border-l">
                        {nodes.map((node) => (
                          <div
                            className="group flex h-8 items-center gap-1 rounded-md pr-1 pl-2 transition-colors hover:bg-accent/50"
                            key={node.id}
                          >
                            <span
                              className="min-w-0 flex-1 truncate text-muted-foreground text-xs group-hover:text-foreground"
                              title={String(node.data.label)}
                            >
                              {node.data.label}
                            </span>
                            <Tooltip>
                              <TooltipTrigger
                                delay={0}
                                render={
                                  <Dialog>
                                    <form>
                                      <DialogTrigger
                                        render={
                                          <Button
                                            className="size-6 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-accent-foreground focus-visible:opacity-100 group-hover:opacity-100"
                                            variant="ghost"
                                          >
                                            <GitBranch className="size-3.5" />
                                          </Button>
                                        }
                                      />
                                      <DialogContent className="sm:max-w-sm">
                                        <DialogHeader>
                                          <DialogTitle>Fork Node</DialogTitle>
                                          <DialogDescription>
                                            A new scenario would be created from
                                            this node.
                                          </DialogDescription>
                                        </DialogHeader>

                                        <form
                                          onSubmit={(e) => {
                                            e.preventDefault();

                                            const formData = new FormData(
                                              e.currentTarget,
                                            );
                                            const name = String(
                                              formData.get("name") ?? "",
                                            ).trim();

                                            if (!name) {
                                              console.log("Name is required");
                                              return;
                                            }

                                            forkNode(node.id, name);
                                          }}
                                        >
                                          <FieldGroup className="mb-2">
                                            <Field>
                                              <Label htmlFor="name-1">
                                                Name
                                              </Label>
                                              <Input
                                                defaultValue="Product Catalog"
                                                id="name-1"
                                                name="name"
                                              />
                                            </Field>
                                          </FieldGroup>

                                          <DialogFooter>
                                            <DialogClose
                                              render={
                                                <Button variant="outline">
                                                  Cancel
                                                </Button>
                                              }
                                            />
                                            <Button type="submit">
                                              Save changes
                                            </Button>
                                          </DialogFooter>
                                        </form>
                                      </DialogContent>
                                    </form>
                                  </Dialog>
                                }
                              />
                              <TooltipContent side="top">
                                <p>Fork from here</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        ))}

                        {nodes.length === 0 && (
                          <p className="px-2 py-2 text-muted-foreground text-xs">
                            Nothing on the canvas yet. Add an endpoint below.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>

          {/* Endpoint library: pinned, scrolls on its own */}
          <CardFooter className="max-h-[45%] min-h-0 flex-col items-stretch gap-0 border-border border-t p-2">
            <div className="flex h-8 shrink-0 items-center justify-between px-2">
              <span className="font-medium text-foreground text-xs">
                Available endpoints
              </span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {Object.keys(drafts).length}
              </span>
            </div>

            <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
              {Object.entries(drafts).map(([key, record]) => (
                <div
                  className="group flex h-8 items-center gap-1 rounded-md pr-1 pl-2 transition-colors hover:bg-accent/50"
                  key={key}
                >
                  <span
                    className={`w-11 shrink-0 font-semibold text-[11px] leading-none ${
                      METHOD_STYLE[record.draft.method] ?? "text-primary"
                    }`}
                  >
                    {record.draft.method}
                  </span>

                  <span
                    className="min-w-0 flex-1 truncate text-muted-foreground text-xs group-hover:text-foreground"
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
                          className="size-6 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-accent-foreground focus-visible:opacity-100 group-hover:opacity-100"
                          onClick={() => addEndpoint(key, record.draft)}
                          size="icon"
                          variant="ghost"
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      }
                    />
                    <TooltipContent side="top">
                      <p>Add to canvas</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              ))}

              {Object.keys(drafts).length === 0 && (
                <p className="px-2 py-4 text-center text-muted-foreground text-xs">
                  No endpoints available.
                </p>
              )}
            </div>
          </CardFooter>
        </Card>
      </aside>
    </div>
  );
}
