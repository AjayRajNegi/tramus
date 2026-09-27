import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar";
import { TopBar } from "@/components/layout/topbar/topbar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getScenarios } from "@/lib/actions/dal";
import { queryKeys } from "@/lib/constants";
import { getQueryClient } from "@/lib/query/get-query-client";

export default async function WorkspaceLayout({
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
    staleTime: 2 * 60 * 1000,
  });

  return (
    <>
      <TopBar />
      <SidebarProvider>
        <AppSidebar />
        <SidebarTrigger />
        <main>
          <HydrationBoundary state={dehydrate(queryClient)}>
            <div className="p-4">
              <div className="mt-[60px] flex gap-2">
                <div className="flex items-center justify-center rounded-xl bg-foreground text-background">
                  {children}
                </div>
              </div>
            </div>
          </HydrationBoundary>
        </main>
      </SidebarProvider>
    </>
  );
}
