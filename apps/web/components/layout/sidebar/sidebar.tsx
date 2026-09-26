"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getEndpoints, getScenarios } from "@/lib/actions/dal";
import { queryKeys } from "@/lib/constants";

export function Sidebar() {
  const { workspaceId, scenarioId } = useParams<{
    workspaceId: string;
    scenarioId?: string;
  }>();

  const scenarios = useQuery({
    queryFn: () => getScenarios(workspaceId),
    queryKey: queryKeys.workspaces.scenarios(workspaceId),
  });

  const endpoints = useQuery({
    enabled: !!scenarioId,
    queryFn: () => getEndpoints(scenarioId!),
    queryKey: queryKeys.workspaces.endpoints(scenarioId!),
  });

  return (
    <div className="...">
      <div>
        <p>Scenarios</p>
        {/* {scenarios.isPending && <Skeleton />} */}
        {scenarios.data?.map((s) => (
          <Link href={`/w/${workspaceId}/${s.id}`} key={s.id}>
            {s.name}
          </Link>
        ))}
      </div>
      <div>
        <p>Endpoints</p>
        {!scenarioId && <p>Select a scenario</p>}
        {/* {endpoints.isPending && <Skeleton />} */}
        {endpoints.data?.map((e) => (
          <Link href={`/w/${workspaceId}/${scenarioId}/${e.id}`} key={e.id}>
            {e.path}
          </Link>
        ))}
      </div>
    </div>
  );
}
