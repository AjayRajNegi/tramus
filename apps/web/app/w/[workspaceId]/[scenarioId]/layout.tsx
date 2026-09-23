import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getEndpoints } from "@/lib/actions/dal";
import { getQueryClient } from "@/provider/get-query-client";

export default async function ScenarioLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ endpointId: string }>;
}) {
  const { endpointId } = await params;

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryFn: () => getEndpoints(endpointId),
    queryKey: ["endpoints", endpointId],
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
    </HydrationBoundary>
  );
}
