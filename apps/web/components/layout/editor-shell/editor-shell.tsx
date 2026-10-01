"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { RequestPane } from "./request-page";

export default function EditorShell() {
  return (
    <div className="h-[calc(100svh-90px)]">
      <ResizablePanelGroup className="min-h-0 flex-1" orientation="vertical">
        <ResizablePanel defaultSize={50} minSize={25}>
          <RequestPane />
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
