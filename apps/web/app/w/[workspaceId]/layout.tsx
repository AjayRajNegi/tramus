import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar/sidebar";
import { TobBar } from "@/components/layout/topbar/topbar";
import { getAllPosts } from "@/lib/actions/dal";
import { getQueryClient } from "@/provider/get-query-client";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryFn: getAllPosts,
    queryKey: ["posts"],
  });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="p-4">
        <TobBar />
        <div className="mt-[60px] flex gap-2">
          <Sidebar />
          <div className="flex w-[80%] items-center justify-center rounded-xl bg-foreground text-background">
            {children}
          </div>
        </div>
      </div>
    </HydrationBoundary>
  );
}
