"use client";

import { cn } from "cn";
import { PencilIcon, PlusIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
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
import {
  selectActiveWorkspace,
  selectScenarios,
  selectWorkspaces,
} from "@/lib/store/w/selectors";
import { useWorkspaceStore } from "@/lib/store/w/workspace.store";

export function EndpointLeftbar() {
  const workspaces = useWorkspaceStore(selectWorkspaces);
  const activeWorkspace = useWorkspaceStore(selectActiveWorkspace);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace);
  const deleteWorkspace = useWorkspaceStore((s) => s.deleteWorkspace);
  const renameWorkspace = useWorkspaceStore((s) => s.renameWorkspace);
  const resetWorkspace = useWorkspaceStore((s) => s.resetWorkspace);
  const scenarios = useWorkspaceStore((s) =>
    selectScenarios(s.activeWorkspaceId)(s),
  );
  const switchScenario = useWorkspaceStore((s) => s.switchScenario);

  const [renamingWorkspaceId, setRenamingWorkspaceId] = useState<string | null>(
    null,
  );
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);

  const sortedWorkspaces = Object.values(workspaces).sort(
    (a, b) => a.createdAt - b.createdAt,
  );

  const sortedScenarios = Object.values(scenarios).sort(
    (a, b) => a.createdAt - b.createdAt,
  );

  return (
    <Sidebar className="h-[calc(100svh-40px)] border-none" collapsible="icon">
      <SidebarContent>
        {/* Scenarios */}
        <SidebarGroup>
          <SidebarGroupLabel className="font-semibold text-[10px] text-sidebar-foreground/70 uppercase">
            Workspaces
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {sortedWorkspaces.map((workspace) => {
                const isActive = workspace.id === activeWorkspaceId;

                return (
                  <SidebarMenuItem
                    key={workspace.id}
                    onClick={() => setActiveWorkspace(workspace.id)}
                  >
                    <div
                      className={cn(
                        "group/workspace flex w-full items-center justify-between rounded border-transparent border-l-2 px-2 py-1 text-sidebar-foreground",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        "group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:bg-sidebar-accent group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:text-sidebar-accent-foreground",
                        isActive &&
                          "border-sidebar-primary/40 bg-sidebar-accent text-sidebar-accent-foreground",
                      )}
                    >
                      <div className="flex items-center gap-2 group-data-[collapsible=icon]:size-full group-data-[collapsible=icon]:justify-center">
                        <span className="hidden size-4 shrink-0 items-center justify-center font-semibold text-[10px] uppercase group-data-[collapsible=icon]:flex">
                          {workspace.name.charAt(0)}
                        </span>
                        <span className="truncate text-xs group-data-[collapsible=icon]:hidden">
                          {workspace.name}
                        </span>
                      </div>

                      {/* Workspace actions */}
                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover/workspace:opacity-100">
                        <Dialog
                          onOpenChange={(open) =>
                            setRenamingWorkspaceId(open ? workspace.id : null)
                          }
                          open={renamingWorkspaceId === workspace.id}
                        >
                          <DialogTrigger
                            render={
                              <Button
                                aria-label={`Rename ${workspace.name}`}
                                className="h-fit w-fit p-0 text-muted-foreground hover:bg-accent hover:text-foreground"
                                size="icon"
                                variant="ghost"
                              >
                                <PencilIcon className="size-3" />
                              </Button>
                            }
                          />
                          <DialogContent className="sm:max-w-[320px]">
                            <DialogHeader>
                              <DialogTitle>Rename workspace</DialogTitle>
                              <DialogDescription>
                                Rename “{workspace.name}”.
                              </DialogDescription>
                            </DialogHeader>

                            <form
                              onSubmit={(e) => {
                                e.preventDefault();

                                const formData = new FormData(e.currentTarget);
                                const name = String(
                                  formData.get("name") ?? "",
                                ).trim();

                                if (!name) {
                                  return;
                                }

                                renameWorkspace(workspace.id, name);
                                setRenamingWorkspaceId(null);
                              }}
                            >
                              <FieldGroup className="mb-2">
                                <Field>
                                  <Label htmlFor="rename-workspace">Name</Label>
                                  <Input
                                    defaultValue={workspace.name}
                                    id="rename-workspace"
                                    name="name"
                                  />
                                </Field>
                              </FieldGroup>

                              <DialogFooter>
                                <DialogClose
                                  render={
                                    <Button variant="outline">Cancel</Button>
                                  }
                                />
                                <Button type="submit">Save</Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <Dialog>
                          <DialogTrigger
                            render={
                              <Button
                                aria-label={`Reset ${workspace.name}`}
                                className="h-fit w-fit p-0 text-muted-foreground hover:bg-accent hover:text-foreground"
                                size="icon"
                                variant="ghost"
                              >
                                <RotateCcwIcon className="size-3" />
                              </Button>
                            }
                          />
                          <DialogContent className="sm:max-w-[320px]">
                            <DialogHeader>
                              <DialogTitle>Reset workspace</DialogTitle>
                              <DialogDescription>
                                Reset “{workspace.name}” to its initial state.
                                All tabs, scenarios, and nodes will be cleared.
                              </DialogDescription>
                            </DialogHeader>

                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                resetWorkspace(workspace.id);
                              }}
                            >
                              <DialogFooter>
                                <DialogClose
                                  render={
                                    <Button variant="outline">Cancel</Button>
                                  }
                                />
                                <Button type="submit">Reset</Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <Dialog>
                          <DialogTrigger
                            render={
                              <Button
                                aria-label={`Delete ${workspace.name}`}
                                className="h-fit w-fit p-0 text-muted-foreground hover:bg-accent hover:text-foreground"
                                disabled={
                                  Object.keys(workspaces).length <= 1 &&
                                  isActive
                                }
                                size="icon"
                                variant="ghost"
                              >
                                <Trash2Icon className="size-3" />
                              </Button>
                            }
                          />
                          <DialogContent className="sm:max-w-[320px]">
                            <DialogHeader>
                              <DialogTitle>Delete workspace</DialogTitle>
                              <DialogDescription>
                                Delete “{workspace.name}” and all its tabs and
                                scenarios. This cannot be undone.
                              </DialogDescription>
                            </DialogHeader>

                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                deleteWorkspace(workspace.id);
                              }}
                            >
                              <DialogFooter>
                                <DialogClose
                                  render={
                                    <Button variant="outline">Cancel</Button>
                                  }
                                />
                                <Button type="submit" variant="destructive">
                                  Delete
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </SidebarMenuItem>
                );
              })}
              <SidebarMenuItem className="mt-2">
                <Dialog
                  onOpenChange={setCreatingWorkspace}
                  open={creatingWorkspace}
                >
                  <DialogTrigger
                    render={
                      <SidebarMenuButton
                        className={cn(
                          "border border-sidebar-accent/40 border-dashed text-muted-foreground text-xs",
                          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        )}
                        tooltip="Create new workspace"
                      >
                        <PlusIcon className="size-3" />
                        <span className="group-data-[collapsible=icon]:hidden">
                          Create new workspace
                        </span>
                      </SidebarMenuButton>
                    }
                  />

                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create new Workspace</DialogTitle>
                      <DialogDescription>
                        A new workspace would be created.
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

                        createWorkspace(name);
                        setCreatingWorkspace(false);
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

        {/* Endpoints */}
        <SidebarGroup>
          <SidebarGroupLabel className="font-semibold text-[10px] text-sidebar-foreground/70 uppercase">
            Scenarios
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {sortedScenarios.map((scenario) => {
                const isActive =
                  activeWorkspace.activeScenarioId === scenario.id;

                return (
                  <SidebarMenuItem
                    key={scenario.id}
                    onClick={() =>
                      switchScenario(activeWorkspace.id, scenario.id)
                    }
                  >
                    <div
                      className={cn(
                        "flex w-full items-center gap-2 rounded border-transparent border-l-2 px-2 py-1 text-sidebar-foreground",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        "group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-l-0 group-data-[collapsible=icon]:p-0",

                        isActive &&
                          "border-sidebar-primary/40 bg-sidebar-accent text-sidebar-accent-foreground",
                      )}
                    >
                      <div className="flex items-center gap-2 group-data-[collapsible=icon]:size-full group-data-[collapsible=icon]:justify-center">
                        <span
                          className={cn(
                            "hidden size-8 shrink-0 items-center justify-center rounded bg-green-950 font-semibold text-[9px] text-green-600 uppercase group-data-[collapsible=icon]:flex",
                            isActive && "border-white border-l-2",
                          )}
                        >
                          {scenario.name.charAt(0)}
                        </span>
                        <span className="truncate text-xs group-data-[collapsible=icon]:hidden">
                          {scenario.name}
                        </span>
                      </div>
                    </div>
                  </SidebarMenuItem>
                );
              })}
              <SidebarMenuItem className="mt-2">
                <SidebarMenuButton
                  className={cn(
                    "border border-sidebar-accent/40 border-dashed text-muted-foreground text-xs",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                  tooltip="Add Endpoint"
                >
                  <PlusIcon className="size-3" />
                  <span className="group-data-[collapsible=icon]:hidden">
                    Add Endpoint
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
