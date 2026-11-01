"use client";

import { useState } from "react";
import EditorShell from "@/components/layout/editor-shell/editor-shell";
import { EndpointLeftbar } from "@/components/layout/editor-shell/sidebar/endpoint-leftbar";
import { EndpointRightbar } from "@/components/layout/editor-shell/sidebar/endpoint-rightbar";
import { Footer } from "@/components/layout/footer";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function EndpointEditor() {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  return (
    <SidebarProvider
      className="min-h-0"
      onOpenChange={setLeftOpen}
      open={leftOpen}
    >
      <EndpointLeftbar />

      <SidebarProvider
        className="h-svh min-h-0 min-w-0 flex-1"
        onOpenChange={setRightOpen}
        open={rightOpen}
      >
        <main className="h-[calc(100svh-40px)] min-w-0 flex-1 border-border border-l">
          <EditorShell />
        </main>
        <EndpointRightbar />
      </SidebarProvider>

      <Footer
        onToggleLeft={() => setLeftOpen((o) => !o)}
        onToggleRight={() => setRightOpen((o) => !o)}
      />
    </SidebarProvider>
  );
}
