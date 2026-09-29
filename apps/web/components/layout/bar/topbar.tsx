"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ModeToggle } from "@/components/layout/mode-toggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getEndpoints, getScenarios, getWorkspaces } from "@/lib/actions/dal";
import { queryKeys } from "@/lib/constants";

export function TopBar() {
  const params = useParams<{
    workspaceId?: string;
    scenarioId?: string;
    endpointId?: string;
  }>();

  const workspaces = useQuery({
    queryFn: getWorkspaces,
    queryKey: queryKeys.workspaces.lists(),
    staleTime: 2 * 60 * 1000,
  });

  const scenarios = useQuery({
    enabled: !!params.workspaceId,
    queryFn: () => getScenarios(params.workspaceId!),
    queryKey: queryKeys.workspaces.scenarios(params.workspaceId!),
  });

  const endpoints = useQuery({
    enabled: !!params.scenarioId,
    queryFn: () => getEndpoints(params.scenarioId!),
    queryKey: queryKeys.workspaces.endpoints(params.scenarioId!),
  });

  const currentWorkspace = workspaces.data?.find(
    (w) => w.id === params.workspaceId,
  );
  const currentScenario = scenarios.data?.find(
    (s) => s.id === params.scenarioId,
  );
  const currentEndpoint = endpoints.data?.find(
    (e) => e.id === params.endpointId,
  );

  return (
    <nav className="fixed top-0 left-1/2 flex h-[50px] w-full -translate-x-1/2 items-center justify-between border-border border-b bg-background px-4 text-foreground text-xs">
      <div className="flex items-center gap-5">
        <Link className="mr-5 underline underline-offset-2" href="/w">
          Tramus
        </Link>

        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink
                className="text-xs"
                href={`/w/${params.workspaceId}`}
              >
                {params.workspaceId && workspaces.isPending && (
                  <span>Loading…</span>
                )}
                {currentWorkspace?.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            {params.scenarioId && (
              <BreadcrumbSeparator className="hidden md:block" />
            )}
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink
                className="text-xs"
                href={`/w/${params.workspaceId}/${params.scenarioId}`}
              >
                {params.scenarioId && scenarios.isPending && (
                  <span>Loading…</span>
                )}
                {currentScenario?.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            {params.endpointId && (
              <BreadcrumbSeparator className="hidden md:block" />
            )}
            <BreadcrumbItem>
              <BreadcrumbPage className="text-xs">
                {params.endpointId && endpoints.isPending && (
                  <span>Loading…</span>
                )}
                {currentEndpoint?.path}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-4">
        <Link className="underline underline-offset-2" href="/w">
          Fork Scenario
        </Link>
        <Link className="underline underline-offset-2" href="/w">
          Share
        </Link>
        <Link className="underline underline-offset-2" href="/w">
          New endpoint
        </Link>
        <ModeToggle />
      </div>
    </nav>
  );
}
