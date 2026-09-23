"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getScenarios } from "@/lib/actions/dal";
import { queryKeys } from "@/lib/constants";

export default function Workspace() {
  const path = usePathname();
  const uuid = path.split("/")[2];

  const { data, isPending, isError } = useQuery({
    queryFn: () => getScenarios(uuid),
    queryKey: queryKeys.workspaces.scenarios(uuid),
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
            href={`/w/${uuid}/${scenario.id}/${scenario.endpoints[0].id}`}
            key={scenario.id}
          >
            {scenario.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
