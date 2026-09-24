import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getScenarios } from "@/lib/actions/dal";
import { queryKeys } from "@/lib/constants";
import { getQueryClient } from "@/lib/query/get-query-client";

export default async function ScenarioLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryFn: () => getScenarios(workspaceId),
    queryKey: queryKeys.workspaces.scenarios(workspaceId),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
    </HydrationBoundary>
  );
}
