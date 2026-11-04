"use client";

import { cn } from "cn";
import { PlusIcon } from "lucide-react";
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

const _METHOD_STYLES: Record<string, string> = {
  DELETE: "bg-red-500/10 text-red-600 dark:text-red-400",
  GET: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  PATCH: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  POST: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  PUT: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

const _isLoggedIn = false;

export function EndpointLeftbar() {
  const workspaces = useWorkspaceStore(selectWorkspaces);
  const activeWorkspace = useWorkspaceStore(selectActiveWorkspace);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const scenarios = useWorkspaceStore((s) =>
    selectScenarios(s.activeWorkspaceId)(s),
  );

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
                  <SidebarMenuItem key={workspace.id}>
                    <div
                      className={cn(
                        "flex w-full items-center justify-between rounded border-transparent border-l-2 px-2 py-1.5 text-sidebar-foreground",
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
                  tooltip="Fork from Timeline"
                >
                  <PlusIcon className="size-3" />
                  <span className="group-data-[collapsible=icon]:hidden">
                    Fork from Timeline
                  </span>
                </SidebarMenuButton>
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
                  activeWorkspace?.activeScenarioId === scenario.id;

                return (
                  <SidebarMenuItem key={scenario.id}>
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
