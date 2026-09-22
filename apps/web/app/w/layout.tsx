import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getAllUser, getWorkspaces } from "@/lib/actions/dal";
import { getQueryClient } from "@/provider/get-query-client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryFn: getAllUser,
    queryKey: ["users"],
  });

  await queryClient.prefetchQuery({
    queryFn: getWorkspaces,
    queryKey: ["workspaces"],
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
    </HydrationBoundary>
  );
}
