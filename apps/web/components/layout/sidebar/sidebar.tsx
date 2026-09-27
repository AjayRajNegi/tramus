"use client";

import { useQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getScenarios } from "@/lib/actions/dal";
import { queryKeys } from "@/lib/constants";

export function Sidebar() {
  const { workspaceId, scenarioId, endpointId } = useParams<{
    workspaceId: string;
    scenarioId?: string;
    endpointId?: string;
  }>();

  const [activeScenario, setActiveScenario] = useState(scenarioId);
  const [activeEndpoint, setActiveEndpoint] = useState(endpointId);

  useEffect(() => {
    setActiveScenario(scenarioId);
    setActiveEndpoint(endpointId);
  }, [scenarioId, endpointId]);

  const scenarios = useQuery({
    queryFn: () => getScenarios(workspaceId),
    queryKey: queryKeys.workspaces.scenarios(workspaceId),
  });

  return (
    <div className="flex min-h-[90vh] w-[20%] flex-col items-start gap-5 rounded-xl bg-foreground pt-4 text-background">
      <div className="w-full px-2">
        <p className="font-semibold text-[10px] text-muted-foreground uppercase">
          Scenarios
        </p>
        {/* {scenarios.isPending && <Skeleton />} */}
        <div className="mt-1 flex w-full flex-col justify-between text-xs">
          <div className="w-full">
            {scenarios.data?.map((s) => (
              <div
                className={`${s.id === activeScenario ? "bg-violet-500/20" : ""} flex w-full justify-between rounded px-2 py-1.5`}
                key={s.id}
              >
                <Link href={`/w/${workspaceId}/${s.id}`}>{s.name}</Link>
                <p className="text-muted-foreground">{`${s._count.endpoints}`}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-1 rounded border-1 border-muted-foreground border-dashed px-2 py-1 text-muted-foreground">
            <PlusIcon className="size-3" /> Fork from Timeline
          </div>
        </div>
      </div>
      <div className="w-full px-2">
        <p className="font-semibold text-[10px] text-muted-foreground uppercase">
          Endpoints
        </p>
        {!scenarioId && <p className="text-xs">Select a scenario</p>}
        {/* {endpoints.isPending && <Skeleton />} */}

        <div className="mt-1 flex flex-col gap-1 text-xs">
          {scenarios.data
            ?.find((s) => s.id === scenarioId)
            ?.endpoints.map((e) => (
              <div
                className={`${e.id === activeEndpoint ? "border-l-2 border-l-violet-500 bg-violet-200/10" : ""} flex w-full items-center gap-2 rounded px-2 py-1.5`}
                key={e.id}
              >
                <p className="flex h-fit items-center justify-center rounded-[2px] bg-green-950 px-1.5 py-[1.5px] font-semibold text-[8px] text-green-600 uppercase">
                  {e.method}
                </p>
                <Link href={`/w/${workspaceId}/${scenarioId}/${e.id}`}>
                  {e.path}
                </Link>
              </div>
            ))}
        </div>
        <div className="mt-3 flex items-center gap-1 rounded border-1 border-muted-foreground border-dashed px-2 py-1 text-muted-foreground text-xs">
          <PlusIcon className="size-3" /> Add Endpoint
        </div>
      </div>
      {/* <div className="w-full px-2">{}</div> */}
    </div>
  );
}
