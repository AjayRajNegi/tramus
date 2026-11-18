"use client";

import { cn } from "cn";
import {
  EllipsisVerticalIcon,
  EyeOffIcon,
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
  const renameScenario = useWorkspaceStore((s) => s.renameScenario);
  const archiveScenario = useWorkspaceStore((s) => s.archiveScenario);
  const restoreScenario = useWorkspaceStore((s) => s.restoreScenario);
  const scenarios = useWorkspaceStore((s) =>
    selectScenarios(s.activeWorkspaceId)(s),
  );
  const switchScenario = useWorkspaceStore((s) => s.switchScenario);

  const [renamingWorkspaceId, setRenamingWorkspaceId] = useState<string | null>(
    null,
  );
  const [renamingScenarioId, setRenamingScenarioId] = useState<string | null>(
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
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="opacity-0 transition-opacity group-hover/workspace:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                          render={
                            <Button
                              aria-label={`Workspace actions for ${workspace.name}`}
                              className="h-fit w-fit p-0 text-muted-foreground hover:bg-accent hover:text-foreground"
                              size="icon"
                              variant="ghost"
                            >
                              <EllipsisVerticalIcon className="size-3" />
                            </Button>
                          }
                        />

                        <DropdownMenuContent align="start">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-[10px]">
                              Workspace
                            </DropdownMenuLabel>

                            <DropdownMenuItem
                              className="text-xs"
                              onClick={() =>
                                setRenamingWorkspaceId(workspace.id)
                              }
                            >
                              <PencilIcon className="size-3" />
                              Rename
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              className="text-xs"
                              onClick={() => resetWorkspace(workspace.id)}
                            >
                              <RotateCcwIcon className="size-3" />
                              Reset
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              className="text-destructive text-xs"
                              disabled={
                                Object.keys(workspaces).length <= 1 && isActive
                              }
                              onClick={() => deleteWorkspace(workspace.id)}
                            >
                              <Trash2Icon className="size-3" />
                              Delete
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

        {/* Rename workspace dialog */}
        {renamingWorkspaceId !== null && (
          <Dialog
            onOpenChange={(open) => {
              if (!open) setRenamingWorkspaceId(null);
            }}
            open={renamingWorkspaceId !== null}
          >
            <DialogTrigger render={<button />} />
            <DialogContent className="sm:max-w-[320px]">
              <DialogHeader>
                <DialogTitle>Rename workspace</DialogTitle>
                <DialogDescription>
                  Rename "{workspaces[renamingWorkspaceId]?.name ?? ""}".
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

                  renameWorkspace(renamingWorkspaceId, name);
                  setRenamingWorkspaceId(null);
                }}
              >
                <FieldGroup className="mb-2">
                  <Field>
                    <Label htmlFor="rename-workspace">Name</Label>
                    <Input
                      defaultValue={workspaces[renamingWorkspaceId]?.name ?? ""}
                      id="rename-workspace"
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
                        "group/scenario flex w-full items-center justify-between rounded border-transparent border-l-2 px-2 py-1 text-sidebar-foreground",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        "group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-l-0 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:text-sidebar-accent-foreground",
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

                      {/* Scenario actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="opacity-0 transition-opacity group-hover/scenario:opacity-100"
                          render={
                            <Button
                              aria-label={`Scenario actions for ${scenario.name}`}
                              className="h-fit w-fit p-0 text-muted-foreground hover:bg-accent hover:text-foreground"
                              size="icon"
                              variant="ghost"
                            >
                              <EllipsisVerticalIcon className="size-3" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent>
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-[10px]">
                              Scenario
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              className="text-xs"
                              onClick={() => {
                                setRenamingScenarioId(scenario.id);
                              }}
                            >
                              <PencilIcon className="size-3" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-xs"
                              disabled={scenario.archived}
                              onClick={() => {
                                archiveScenario(
                                  activeWorkspace.id,
                                  scenario.id,
                                );
                              }}
                            >
                              <EyeOffIcon className="size-3" />
                              Archive
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-xs"
                              disabled={!scenario.archived}
                              onClick={() => {
                                restoreScenario(
                                  activeWorkspace.id,
                                  scenario.id,
                                );
                              }}
                            >
                              <RotateCcwIcon className="size-3" />
                              Restore
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </SidebarMenuItem>
                );
              })}
              {/* <SidebarMenuItem className="mt-2">
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
              </SidebarMenuItem> */}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Rename scenario dialog */}
        {renamingScenarioId !== null && (
          <Dialog
            onOpenChange={(open) => {
              if (!open) setRenamingScenarioId(null);
            }}
            open={renamingScenarioId !== null}
          >
            <DialogTrigger>
              <Button />
            </DialogTrigger>
            <DialogContent className="sm:max-w-[320px]">
              <DialogHeader>
                <DialogTitle>Rename scenario</DialogTitle>
                <DialogDescription>
                  Rename "{scenarios[renamingScenarioId]?.name ?? ""}".
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

                  renameScenario(activeWorkspaceId, renamingScenarioId, name);
                  setRenamingScenarioId(null);
                }}
              >
                <FieldGroup className="mb-2">
                  <Field>
                    <Label htmlFor="rename-scenario">Name</Label>
                    <Input
                      defaultValue={scenarios[renamingScenarioId]?.name ?? ""}
                      id="rename-scenario"
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
