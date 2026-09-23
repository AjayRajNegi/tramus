import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getWorkspaces } from "@/lib/actions/dal";
import { queryKeys } from "@/lib/constants";
import { getQueryClient } from "@/provider/get-query-client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryFn: getWorkspaces,
    queryKey: queryKeys.workspaces.list(),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
    </HydrationBoundary>
  );
}
