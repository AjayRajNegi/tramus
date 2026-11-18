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
import { getAncestry } from "@/lib/store/w/graph";
import { stripFileContents } from "@/lib/store/w/helpers";
import { selectActiveWorkspace } from "@/lib/store/w/selectors";
import type { EndpointDraft } from "@/lib/store/w/tab.store.types";
import { useWorkspaceStore } from "@/lib/store/w/workspace.store";

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
  const ws = useWorkspaceStore(selectActiveWorkspace);
  const addNode = useWorkspaceStore((s) => s.addNode);
  const setParent = useWorkspaceStore((s) => s.setParent);
  const removeNode = useWorkspaceStore((s) => s.removeNode);
  const setNodePosition = useWorkspaceStore((s) => s.setNodePosition);
  const fork = useWorkspaceStore((s) => s.fork);
  const switchScenario = useWorkspaceStore((s) => s.switchScenario);

  const workspaceId = ws?.id;
  const storeNodes = ws?.nodes ?? {};
  const activeScenarioId = ws?.activeScenarioId;
  const positionOverrides = ws?.positionOverrides ?? {};
  const scenarios = ws?.scenarios ?? {};
  const drafts = ws?.drafts ?? {};

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
    const state = useWorkspaceStore.getState();
    const activeWs = state.workspaces[state.activeWorkspaceId];
    const nodes = activeWs?.nodes ?? {};
    return !getAncestry(nodes, link.parentId).includes(link.childId); // no cycles
  }, []);

  const onConnect = useCallback(
    (c: Connection) => {
      const link = resolveLink(c);
      if (link && workspaceId)
        setParent(workspaceId, link.childId, link.parentId);
    },
    [workspaceId, setParent],
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) =>
      deleted.forEach((e) => {
        workspaceId && setParent(workspaceId, e.target, null);
      }),
    [workspaceId, setParent],
  );

  const onNodesDelete = useCallback(
    (deleted: { id: string }[]) =>
      deleted.forEach((n) => {
        workspaceId && removeNode(workspaceId, n.id);
      }),
    [workspaceId, removeNode],
  );

  const addEndpoint = (endpointId: string, draft: EndpointDraft) =>
    workspaceId &&
    addNode(workspaceId, {
      endpointId,
      requestId: crypto.randomUUID(),
      snapshot: stripFileContents(draft),
    });

  const forkNode = (nodeId: string, name: string) =>
    workspaceId && fork(workspaceId, { nodeId }, name);

  if (!ws) return null;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden">
      {/* Flow canvas */}
      <section className="min-w-0 flex-1 p-4">
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
              setNodePosition(ws.id, node.id, node.position)
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
      <aside className="flex w-80 shrink-0 flex-col overflow-hidden border-border border-l bg-background">
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
                {ws.name}
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
                      onClick={() => switchScenario(ws.id, scenario.id)}
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
                      <div className="mt-1 mb-1 ml-4 space-y-0.5 border-border/60 border-l">
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
                            <Dialog>
                              <Tooltip>
                                <TooltipTrigger
                                  delay={0}
                                  render={
                                    <DialogTrigger
                                      render={
                                        <Button size="icon" variant="ghost">
                                          <GitBranch className="size-3.5" />
                                        </Button>
                                      }
                                    />
                                  }
                                />
                                <TooltipContent side="left">
                                  Fork from here
                                </TooltipContent>
                              </Tooltip>

                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Fork Node</DialogTitle>
                                  <DialogDescription>
                                    A new scenario would be created from this
                                    node.
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
                                      <Label htmlFor="name-1">Name</Label>
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
                                    <Button type="submit">Save changes</Button>
                                  </DialogFooter>
                                </form>
                              </DialogContent>
                            </Dialog>
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
                    <TooltipContent side="left">
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

function resolveLink(c: Connection) {
  const { source, target, sourceHandle, targetHandle } = c;
  if (source === target) return null;
  if (sourceHandle === "bottom" && targetHandle === "top")
    return { childId: target, parentId: source };
  if (sourceHandle === "top" && targetHandle === "bottom")
    return { childId: source, parentId: target };
  return null;
}
