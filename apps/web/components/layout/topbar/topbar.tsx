"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getEndpoints, getScenarios, getWorkspaces } from "@/lib/actions/dal";
import { queryKeys } from "@/lib/constants";

export function TopBar() {
  const params = useParams<{
    workspaceId: string;
    scenarioId: string;
    endpointId: string;
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

  return (
    <nav className="fixed top-0 left-1/2 mt-4 flex h-[50px] w-[80%] -translate-x-1/2 items-center justify-between rounded-xl bg-foreground px-4 text-background">
      <Link className="mr-5 underline underline-offset-2" href="/w">
        Tramus
      </Link>
      <div className="flex gap-4">
        <div>
          {workspaces.isPending && <div>Loading...</div>}
          {
            workspaces.data?.filter(
              (workspace) => workspace.id === params.workspaceId,
            )[0].name
          }
        </div>
        <div>
          {scenarios.isPending && <div>Loading...</div>}
          {
            scenarios.data?.filter(
              (scenario) => scenario.id !== params.scenarioId,
            )[0].name
          }
        </div>
        <div>
          {endpoints.isPending && <div>Loading...</div>}
          {
            endpoints.data?.filter(
              (endpoint) => endpoint.id === params.endpointId,
            )[0].path
          }
        </div>
      </div>
      <div>
        <Link className="mr-5 underline underline-offset-2" href="/w">
          Fork Scenario
        </Link>
        <Link className="mr-5 underline underline-offset-2" href="/w">
          Share
        </Link>
        <Link className="underline underline-offset-2" href="/w">
          New endpoint
        </Link>
      </div>
    </nav>
  );
}
