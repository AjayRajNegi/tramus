"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { getScenarios } from "@/lib/actions/dal";

export default function Workspace() {
  const path = usePathname();
  const uuid = path.split("/")[2];

  const { data, isPending, isError } = useQuery({
    queryFn: () => getScenarios(uuid),
    queryKey: ["scenarios", uuid],
  });

  console.log("uuid", uuid);

  if (isPending) return <p>Loading...</p>;
  if (isError) return <p>Error...</p>;

  return (
    <div>
      <div>This is workspace:</div>
      <div>
        {data.map((scenario) => (
          <div key={scenario.id}>{scenario.name}</div>
        ))}
      </div>
    </div>
  );
}
