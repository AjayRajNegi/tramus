"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { getScenarios } from "@/lib/actions/dal";
import { queryKeys } from "@/lib/constants";

export default function ScenarioPage() {
  const params = useParams<{
    workspaceId: string;
    scenarioId: string;
  }>();

  const { data, isPending, isError } = useQuery({
    enabled: !!params.scenarioId,
    queryFn: () => getScenarios(params.workspaceId),
    queryKey: queryKeys.workspaces.detail(params.scenarioId),
  });

  useEffect(() => {
    const scenario = data?.find((s) => s.id === params.scenarioId);
    const firstEndpoint = scenario?.endpoints[0];

    // if(fris)
  }, [data, params]);

  if (isPending) return <p>Loading...</p>;
  if (isError) return <p>Error...</p>;

  console.log(data);

  return (
    <div className="flex flex-col">
      {data
        ?.find((s) => s.id === params.scenarioId)
        ?.endpoints.map((endpoint) => (
          <Link
            href={`/w/${params.workspaceId}/${params.scenarioId}/${endpoint.id}`}
            key={endpoint.id}
          >
            {endpoint.path}
          </Link>
        ))}
    </div>
  );
}
