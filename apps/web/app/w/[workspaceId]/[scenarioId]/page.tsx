"use client";

import { useQuery } from "@tanstack/react-query";
import { redirect, useParams } from "next/navigation";
import { getScenarios } from "@/lib/actions/dal";
import { queryKeys } from "@/lib/constants";

export default function ScenarioPage() {
  const params = useParams<{
    workspaceId: string;
    scenarioId: string;
    endpointId: string;
  }>();

  const { data, isPending, isError } = useQuery({
    queryFn: () => getScenarios(params.scenarioId),
    queryKey: queryKeys.workspaces.scenarios(params.scenarioId),
  });

  if (isPending) return <p>Loading...</p>;
  if (isError) return <p>Error...</p>;

  // redirect(`/w/${params.scenarioId}/${data[0].id}/${data[0].endpoints[0].id}`);
  return <div>{params.scenarioId}</div>;
}
