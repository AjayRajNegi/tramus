"use client";

import { useQuery } from "@tanstack/react-query";
import { cn } from "cn";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { getScenarios } from "@/lib/actions/dal";
import { queryKeys } from "@/lib/constants";

export function AppSidebar() {
  const { workspaceId, scenarioId, endpointId } = useParams<{
    workspaceId: string;
    scenarioId?: string;
    endpointId?: string;
  }>();

  const [activeScenario, setActiveScenario] = useState(scenarioId);
  const [activeEndpoint, setActiveEndpoint] = useState(endpointId);

  useEffect(() => {
    setActiveScenario(scenarioId);
    setActiveEndpoint(endpointId);
  }, [scenarioId, endpointId]);

  const scenarios = useQuery({
    queryFn: () => getScenarios(workspaceId),
    queryKey: queryKeys.workspaces.scenarios(workspaceId),
  });

  const activeScenarioEndpoints = scenarios.data?.find(
    (s) => s.id === scenarioId,
  )?.endpoints;

  return (
    <Sidebar
      className="top-[50px] h-[calc(100svh-90px)] border-none"
      collapsible="icon"
    >
      <SidebarContent>
        {/* Scenarios */}

        <SidebarGroup>
          <SidebarGroupLabel className="font-semibold text-[10px] text-sidebar-foreground/70 uppercase">
            Scenarios
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {scenarios.data?.map((s) => {
                const isActive = s.id === activeScenario;

                return (
                  <SidebarMenuItem key={s.id}>
                    <div
                      className={cn(
                        "flex w-full items-center justify-between rounded border-transparent border-l-2 px-2 py-1.5 text-sidebar-foreground",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        "group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:bg-sidebar-accent group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:text-sidebar-accent-foreground",
                        isActive &&
                          "border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground",
                      )}
                    >
                      <Link
                        className="flex items-center gap-2 group-data-[collapsible=icon]:size-full group-data-[collapsible=icon]:justify-center"
                        href={`/w/${workspaceId}/${s.id}`}
                      >
                        <span className="hidden size-4 shrink-0 items-center justify-center font-semibold text-[10px] uppercase group-data-[collapsible=icon]:flex">
                          {s.name.charAt(0)}
                        </span>
                        <span className="truncate text-xs group-data-[collapsible=icon]:hidden">
                          {s.name}
                        </span>
                        <SidebarMenuBadge className="text-muted-foreground group-data-[collapsible=icon]:hidden">
                          <p className="text-muted-foreground group-data-[collapsible=icon]:hidden">
                            {s._count.endpoints}
                          </p>
                        </SidebarMenuBadge>
                      </Link>
                    </div>
                  </SidebarMenuItem>
                );
              })}

              <SidebarMenuItem className="mt-2">
                <SidebarMenuButton
                  className={cn(
                    "border border-sidebar-border border-dashed text-muted-foreground text-xs",
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
            Endpoints
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {!scenarioId && (
              <p className="px-2 text-muted-foreground text-xs group-data-[collapsible=icon]:hidden">
                Select a scenario
              </p>
            )}
            <SidebarMenu className="gap-1">
              {activeScenarioEndpoints?.map((e) => {
                const isActive = e.id === activeEndpoint;

                return (
                  <SidebarMenuItem key={e.id}>
                    <div
                      className={cn(
                        "flex w-full items-center gap-2 rounded border-transparent border-l-2 px-2 py-1 text-sidebar-foreground",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        "group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-l-0 group-data-[collapsible=icon]:p-0",

                        isActive &&
                          "border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground",
                      )}
                    >
                      <Link
                        className="flex items-center gap-2 group-data-[collapsible=icon]:size-full group-data-[collapsible=icon]:justify-center"
                        href={`/w/${workspaceId}/${scenarioId}/${e.id}`}
                      >
                        <span className="flex h-fit w-9 shrink-0 items-center justify-center rounded-[2px] bg-green-950 px-2 py-1 font-semibold text-[8px] text-green-600 uppercase group-data-[collapsible=icon]:hidden">
                          {e.method}
                        </span>

                        <span
                          className={cn(
                            "hidden size-8 shrink-0 items-center justify-center rounded bg-green-950 font-semibold text-[9px] text-green-600 uppercase group-data-[collapsible=icon]:flex",
                            isActive && "border-white border-l-2",
                          )}
                        >
                          {e.method.charAt(0)}
                        </span>

                        <span className="truncate text-xs group-data-[collapsible=icon]:hidden">
                          {e.path}
                        </span>
                      </Link>
                    </div>
                  </SidebarMenuItem>
                );
              })}

              <SidebarMenuItem className="mt-2">
                <SidebarMenuButton
                  className={cn(
                    "border border-sidebar-border border-dashed text-muted-foreground text-xs",
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
