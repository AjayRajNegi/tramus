"use client";

import { SidebarTrigger } from "../ui/sidebar";
import { ModeToggle } from "./mode-toggle";

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 flex h-[40px] w-screen items-center justify-between border-accent/40 border-t bg-background text-foreground">
      <div className="gap-2">
        <SidebarTrigger />
        <ModeToggle />
      </div>

      <p className="mr-5 text-muted-foreground">tramus</p>
    </footer>
  );
}
