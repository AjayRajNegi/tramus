import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getEndpoint } from "@/lib/actions/dal";
import { queryKeys } from "@/lib/constants";
import { getQueryClient } from "@/lib/query/get-query-client";

export default async function EndpointLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ endpointId: string }>;
}) {
  const { endpointId } = await params;

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryFn: () => getEndpoint(endpointId),
    queryKey: queryKeys.workspaces.endpoints(endpointId),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
    </HydrationBoundary>
  );
}
