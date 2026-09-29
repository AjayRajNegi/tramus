import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { AppSidebar } from "@/components/layout/bar/app-sidebar";
import { TopBar } from "@/components/layout/bar/topbar";
import { Footer } from "@/components/layout/footer";
import { SidebarProvider } from "@/components/ui/sidebar";
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
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SidebarProvider>
        <AppSidebar />
        <TopBar />

        <main className="mt-[50px] h-[calc(100svh-90px)] w-full border-border border-l bg-background p-4 text-foreground">
          <div className="flex gap-2">
            <div className="flex items-center justify-center">{children}</div>
          </div>
        </main>
        <Footer />
      </SidebarProvider>
    </HydrationBoundary>
  );
}
