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
  SidebarTrigger,
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
      className="top-[50px] h-[calc(100svh-50px)] border-none bg-foreground text-background [&_[data-sidebar=sidebar]]:bg-foreground [&_[data-sidebar=sidebar]]:text-background"
      collapsible="icon"
    >
      <SidebarContent>
        {/* Scenarios */}

        <SidebarGroup>
          <SidebarGroupLabel className="font-semibold text-[10px] text-muted-foreground uppercase">
            Scenarios
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {scenarios.data?.map((s) => (
                <SidebarMenuItem key={s.id}>
                  <div
                    // asChild
                    className={cn(
                      "flex w-full justify-between rounded px-2 py-1.5",
                      "hover:bg-transparent hover:text-current",
                      s.id === activeScenario &&
                        "bg-violet-500/20 hover:bg-violet-500/20",
                    )}
                    key={s.id}
                  >
                    <Link
                      className="flex gap-2"
                      href={`/w/${workspaceId}/${s.id}`}
                    >
                      <span className="hidden size-4 shrink-0 items-center justify-center rounded-[2px] bg-violet-500/30 font-semibold text-[8px] uppercase group-data-[collapsible=icon]:flex">
                        {s.name.charAt(0)}
                      </span>
                      <span className="truncate group-data-[collapsible=icon]:hidden">
                        {s.name}
                      </span>
                    </Link>
                  </div>
                  <SidebarMenuBadge className="text-muted-foreground hover:text-muted-foreground group-data-[collapsible=icon]:hidden">
                    <p className="text-muted-foreground hover:text-muted-foreground group-data-[collapsible=icon]:hidden">
                      {s._count.endpoints}
                    </p>
                  </SidebarMenuBadge>
                </SidebarMenuItem>
              ))}

              <SidebarMenuItem>
                <SidebarMenuButton
                  className={cn(
                    "border border-muted-foreground border-dashed text-muted-foreground text-xs",
                    "hover:bg-transparent hover:text-muted-foreground",
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
          <SidebarGroupLabel className="font-semibold text-[10px] text-muted-foreground uppercase">
            Endpoints
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {!scenarioId && (
              <p className="px-2 text-background/70 text-xs group-data-[collapsible=icon]:hidden">
                Select a scenario
              </p>
            )}
            <SidebarMenu>
              {activeScenarioEndpoints?.map((e) => (
                <SidebarMenuItem key={e.id}>
                  <div
                    // asChild
                    className={`${e.id === activeEndpoint ? "border-l-2 border-l-violet-500 bg-violet-200/10" : ""} flex w-full items-center gap-2 rounded px-2 py-1.5`}
                  >
                    <Link
                      className="flex gap-2"
                      href={`/w/${workspaceId}/${scenarioId}/${e.id}`}
                    >
                      <span className="flex h-fit w-9 shrink-0 items-center justify-center rounded-[2px] bg-green-950 px-2 py-1 font-semibold text-[8px] text-green-600 uppercase group-data-[collapsible=icon]:hidden">
                        {e.method}
                      </span>
                      <span className="hidden size-4 shrink-0 items-center justify-center rounded-[2px] bg-green-950 font-semibold text-[7px] text-green-600 uppercase group-data-[collapsible=icon]:flex">
                        {e.method.charAt(0)}
                      </span>
                      <span className="truncate group-data-[collapsible=icon]:hidden">
                        {e.path}
                      </span>
                    </Link>
                  </div>
                </SidebarMenuItem>
              ))}

              <SidebarMenuItem>
                <SidebarMenuButton
                  className="border border-muted-foreground border-dashed text-muted-foreground text-xs hover:bg-transparent hover:text-background"
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
