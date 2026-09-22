"use client";

import { useQuery } from "@tanstack/react-query";
import { getWorkspaces } from "@/lib/actions/dal";

export default function Dashboard() {
  const { data, isPending, isError } = useQuery({
    queryFn: getWorkspaces,
    queryKey: ["workspaces"],
  });

  return (
    <div>
      <div>Page to list all the workspaces</div>
      <div>
        {data.map((workspaces) => (
          <div className="flex gap-4" key={workspaces.id}>
            <div>{workspaces.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
