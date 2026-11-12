"use client";

import { cn } from "cn";
import {
  GitBranchIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { selectActiveWorkspace, selectTabs } from "@/lib/store/w/selectors";
import type { EndpointDraft } from "@/lib/store/w/tab.store.types";
import { useWorkspaceStore } from "@/lib/store/w/workspace.store";

export function EndpointRightbar() {
  const ws = useWorkspaceStore(selectActiveWorkspace);
  const tabs = useWorkspaceStore((s) => selectTabs(s.activeWorkspaceId)(s));
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const closeTab = useWorkspaceStore((s) => s.closeTab);
  const createEndpoint = useWorkspaceStore((s) => s.createEndpoint);
  const deleteEndpoint = useWorkspaceStore((s) => s.deleteEndpoint);
  const renameEndpoint = useWorkspaceStore((s) => s.renameEndpoint);
  const resetDraft = useWorkspaceStore((s) => s.resetDraft);
  const fork = useWorkspaceStore((s) => s.fork);
  const openTab = useWorkspaceStore((s) => s.openTab);

  const [renamingEndpointId, setRenamingEndpointId] = useState<string | null>(
    null,
  );
  const [forkingEndpointId, setForkingEndpointId] = useState<string | null>(
    null,
  );
  const [creatingEndpoint, setCreatingEndpoint] = useState(false);

  if (!ws) return null;

  const activeWorkspaceId = ws.id;

  const sortedEndpoints = Object.values(ws.endpoints).sort(
    (a, b) => a.createdAt - b.createdAt,
  );

  return (
    <Sidebar
      className="h-[calc(100svh-40px)] border-none"
      collapsible="offcanvas"
      side="right"
    >
      <SidebarContent>
        {/* Endpoints */}
        <SidebarGroup>
          <SidebarGroupLabel className="font-semibold text-[10px] text-sidebar-foreground/70 uppercase">
            Endpoints
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {sortedEndpoints.map((endpoint) => {
                const activeTab = tabs.find(
                  (t) => t.endpointId === endpoint.id,
                );
                const isActive = activeTab?.id === ws.activeTabId;

                return (
                  <SidebarMenuItem
                    key={endpoint.id}
                    onClick={() => {
                      if (activeTab) {
                        setActiveTab(activeWorkspaceId, activeTab.id);
                      } else {
                        openTab(activeWorkspaceId, {
                          endpointId: endpoint.id,
                          scenarioId: ws.activeScenarioId,
                        });
                      }
                    }}
                  >
                    <div
                      className={cn(
                        "group/endpoint flex w-full items-center justify-between rounded border-transparent border-l-2 px-2 py-1 text-sidebar-foreground",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        "group-data-[collapsible=offcanvas]:px-2 group-data-[collapsible=offcanvas]:py-1",
                        isActive &&
                          "border-sidebar-primary/40 bg-sidebar-accent text-sidebar-accent-foreground",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="truncate text-xs group-data-[collapsible=offcanvas]:hidden"
                          title={endpoint.definition.url}
                        >
                          {endpoint.name}
                        </span>
                      </div>

                      {/* Endpoint actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button
                            aria-label={`Endpoint actions for ${endpoint.name}`}
                            className="h-fit w-fit p-0 text-muted-foreground hover:bg-accent hover:text-foreground"
                            size="icon"
                            variant="ghost"
                          >
                            <PencilIcon className="size-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuGroup>
                            <DropdownMenuLabel inset>
                              Endpoint
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => {
                                setRenamingEndpointId(endpoint.id);
                              }}
                            >
                              <PencilIcon className="size-3" />
                              Rename endpoint
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                const tab = tabs.find(
                                  (t) => t.endpointId === endpoint.id,
                                );
                                if (tab) {
                                  resetDraft(activeWorkspaceId, tab.id);
                                }
                              }}
                            >
                              <RotateCcwIcon className="size-3" />
                              Reset draft
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setForkingEndpointId(endpoint.id);
                              }}
                            >
                              <GitBranchIcon className="size-3" />
                              Fork from endpoint
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                const tab = tabs.find(
                                  (t) => t.endpointId === endpoint.id,
                                );
                                if (tab) {
                                  closeTab(activeWorkspaceId, tab.id);
                                }
                                deleteEndpoint(activeWorkspaceId, endpoint.id);
                              }}
                            >
                              <Trash2Icon className="size-3" />
                              Delete endpoint
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </SidebarMenuItem>
                );
              })}
              <SidebarMenuItem className="mt-2">
                <Dialog
                  onOpenChange={setCreatingEndpoint}
                  open={creatingEndpoint}
                >
                  <DialogTrigger
                    render={
                      <SidebarMenuButton
                        className={cn(
                          "border border-sidebar-accent/40 border-dashed text-muted-foreground text-xs",
                          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        )}
                        tooltip="Create new endpoint"
                      >
                        <PlusIcon className="size-3" />
                        <span className="group-data-[collapsible=offcanvas]:hidden">
                          Create new endpoint
                        </span>
                      </SidebarMenuButton>
                    }
                  />

                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create new Endpoint</DialogTitle>
                      <DialogDescription>
                        A new endpoint would be created and opened.
                      </DialogDescription>
                    </DialogHeader>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();

                        const formData = new FormData(e.currentTarget);
                        const name = String(formData.get("name") ?? "").trim();

                        if (!name) {
                          console.log("Name is required");
                          return;
                        }

                        const definition: EndpointDraft = {
                          authorization: {
                            password: "",
                            token: "",
                            type: "none",
                            username: "",
                          },
                          body: {
                            file: null,
                            form: [],
                            formData: [],
                            json: "",
                            raw: "",
                            type: "none",
                          },
                          headers: [],
                          method: "GET",
                          params: [],
                          path: "http://localhost:3000",
                          url: "http://localhost:3000",
                        };

                        const endpointId = createEndpoint(activeWorkspaceId, {
                          definition,
                          name,
                        });
                        openTab(activeWorkspaceId, {
                          endpointId,
                          scenarioId: ws.activeScenarioId,
                        });
                        setCreatingEndpoint(false);
                      }}
                    >
                      <FieldGroup className="mb-2">
                        <Field>
                          <Label htmlFor="name-1">Name</Label>
                          <Input
                            defaultValue="New endpoint"
                            id="name-1"
                            name="name"
                          />
                        </Field>
                      </FieldGroup>

                      <DialogFooter>
                        <DialogClose
                          render={<Button variant="outline">Cancel</Button>}
                        />
                        <Button type="submit">Save changes</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Rename endpoint dialog */}
        {renamingEndpointId !== null && (
          <Dialog
            onOpenChange={(open) => {
              if (!open) setRenamingEndpointId(null);
            }}
            open={renamingEndpointId !== null}
          >
            <DialogTrigger>
              <Button />
            </DialogTrigger>
            <DialogContent className="sm:max-w-[320px]">
              <DialogHeader>
                <DialogTitle>Rename endpoint</DialogTitle>
                <DialogDescription>
                  Rename "{ws.endpoints[renamingEndpointId]?.name ?? ""}".
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={(e) => {
                  e.preventDefault();

                  const formData = new FormData(e.currentTarget);
                  const name = String(formData.get("name") ?? "").trim();

                  if (!name) {
                    return;
                  }

                  renameEndpoint(activeWorkspaceId, renamingEndpointId, name);
                  setRenamingEndpointId(null);
                }}
              >
                <FieldGroup className="mb-2">
                  <Field>
                    <Label htmlFor="rename-endpoint">Name</Label>
                    <Input
                      defaultValue={
                        ws.endpoints[renamingEndpointId]?.name ?? ""
                      }
                      id="rename-endpoint"
                      name="name"
                    />
                  </Field>
                </FieldGroup>

                <DialogFooter>
                  <DialogClose
                    render={<Button variant="outline">Cancel</Button>}
                  />
                  <Button type="submit">Save</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Fork from endpoint dialog */}
        {forkingEndpointId !== null && (
          <Dialog
            onOpenChange={(open) => {
              if (!open) setForkingEndpointId(null);
            }}
            open={forkingEndpointId !== null}
          >
            <DialogTrigger>
              <Button />
            </DialogTrigger>
            <DialogContent className="sm:max-w-[320px]">
              <DialogHeader>
                <DialogTitle>Fork from endpoint</DialogTitle>
                <DialogDescription>
                  Create a new scenario from "
                  {ws.endpoints[forkingEndpointId]?.name ?? ""}".
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={(e) => {
                  e.preventDefault();

                  const formData = new FormData(e.currentTarget);
                  const name = String(formData.get("name") ?? "").trim();

                  if (!name) {
                    return;
                  }

                  const tab = tabs.find(
                    (t) => t.endpointId === forkingEndpointId,
                  );
                  if (tab) {
                    fork(
                      activeWorkspaceId,
                      {
                        tabId: tab.id,
                      },
                      name,
                    );
                  }
                  setForkingEndpointId(null);
                }}
              >
                <FieldGroup className="mb-2">
                  <Field>
                    <Label htmlFor="fork-endpoint">Scenario name</Label>
                    <Input
                      defaultValue={`Fork of ${
                        ws.endpoints[forkingEndpointId]?.name ?? ""
                      }`}
                      id="fork-endpoint"
                      name="name"
                    />
                  </Field>
                </FieldGroup>

                <DialogFooter>
                  <DialogClose
                    render={<Button variant="outline">Cancel</Button>}
                  />
                  <Button type="submit">Save</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
