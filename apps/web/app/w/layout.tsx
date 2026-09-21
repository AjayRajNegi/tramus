import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getAllUser } from "@/lib/actions/dal";
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

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
    </HydrationBoundary>
  );
}
