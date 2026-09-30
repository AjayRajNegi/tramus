"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export default function EditorShell() {
  //   const params = useParams<{
  //     workspaceId: string;
  //     scenarioId: string;
  //     endpointId: string;
  //   }>();
  //   const { data, isPending, isError } = useQuery({
  //     queryFn: () => getScenarios(params.workspaceId),
  //     queryKey: queryKeys.workspaces.scenarios(params.workspaceId),
  //     staleTime: 2 * 60 * 1000,
  //   });

  //   if (isPending) return <p>Loading...</p>;
  //   if (isError) return <p>Error...</p>;
  //   console.log(data);
  return (
    <div className="h-[calc(100svh-90px)]">
      <ResizablePanelGroup className="min-h-0 flex-1" orientation="vertical">
        <ResizablePanel defaultSize={50} minSize={25}>
          {/* <RequestPane /> */}
          Request
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50} minSize={15}>
          {/* <ResponsePane /> */}
          Response
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
