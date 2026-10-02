"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useEditorState } from "@/lib/store/editor.store";
import EndpointBar from "./endpoint-bar";
import { RequestPane } from "./request-page";

export default function EditorShell() {
  const { drafts } = useEditorState();
  console.log(drafts[0]);
  return (
    <div className="h-[calc(100svh-90px)]">
      <ResizablePanelGroup className="min-h-0 flex-1" orientation="vertical">
        <ResizablePanel defaultSize={50} minSize={25}>
          <EndpointBar />
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
