"use client";

import { useQuery } from "@tanstack/react-query";
import { redirect, usePathname } from "next/navigation";
import { getScenarios } from "@/lib/actions/dal";
import { queryKeys } from "@/lib/constants";

export default function ScenarioPage() {
  const path = usePathname();
  const uuid = path.split("/")[2];

  const { data, isPending, isError } = useQuery({
    queryFn: () => getScenarios(uuid),
    queryKey: queryKeys.workspaces.scenarios(uuid),
  });

  if (isPending) return <p>Loading...</p>;
  if (isError) return <p>Error...</p>;

  redirect(`/w/${uuid}/${data[0].id}/${data[0].endpoints[0].id}`);
}
