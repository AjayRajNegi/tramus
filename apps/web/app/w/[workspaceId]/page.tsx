"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getScenarios } from "@/lib/actions/dal";
import { queryKeys } from "@/lib/constants";

export default function Workspace() {
  const params = useParams<{
    workspaceId: string;
    scenarioId: string;
    endpointId: string;
  }>();

  const { data, isPending, isError } = useQuery({
    queryFn: () => getScenarios(params.workspaceId),
    queryKey: queryKeys.workspaces.scenarios(params.workspaceId),
    staleTime: 2 * 60 * 1000,
  });

  if (isPending) return <p>Loading...</p>;
  if (isError) return <p>Error...</p>;

  return (
    <div>
      <div>This is workspace:</div>
      <div>
        {data.map((scenario) => (
          <Link
            className="cursor-pointer"
            href={`/w/${params.workspaceId}/${scenario.id}/${scenario.endpoints[0].id}`}
            key={scenario.id}
          >
            {scenario.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
