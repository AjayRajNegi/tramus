"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, usePathname } from "next/navigation";
import { getEndpointsData } from "@/lib/actions/dal";
import { queryKeys } from "@/lib/constants";

export default function EndpointPage() {
  const pathname = usePathname();
  const params = useParams<{
    workspaceId: string;
    scenarioId: string;
    endpointId: string;
  }>();
  console.log(params.endpointId);
  const uuid = pathname.split("/")[4];

  const { data, isError, isPending } = useQuery({
    queryFn: () => getEndpointsData(uuid),
    queryKey: queryKeys.workspaces.endpoints(uuid),
  });

  if (isPending) return <p>Loading...</p>;
  if (isError) return <p>Error...</p>;

  if (data == null) {
    return <p>No data...</p>;
  }

  return (
    <div>
      <div>The current Endpoint: {uuid}</div>
      <div>List of all Endpoint</div>
      <div>
        <div>
          <div>{data.path}</div>
          <div>{data.method}</div>
          <div>{data.responseStatus}</div>
        </div>
        <div>Headers</div>
        <div>Body</div>
      </div>
    </div>
  );
}
