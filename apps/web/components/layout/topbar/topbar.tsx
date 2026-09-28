"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ModeToggle } from "@/components/layout/mode-toggle";
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
    <nav className="fixed top-0 left-1/2 flex h-[50px] w-full -translate-x-1/2 items-center justify-between border-border border-b bg-background px-4 text-foreground">
      <Link className="mr-5 underline underline-offset-2" href="/w">
        Tramus
      </Link>

      <div className="flex gap-4">
        <div>
          {params.workspaceId && workspaces.isPending && <span>Loading…</span>}
          {currentWorkspace?.name}
        </div>

        <div>
          {params.scenarioId && scenarios.isPending && <span>Loading…</span>}
          {currentScenario?.name}
        </div>

        <div>
          {params.endpointId && endpoints.isPending && <span>Loading…</span>}
          {currentEndpoint?.path}
        </div>
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
