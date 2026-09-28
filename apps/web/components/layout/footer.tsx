"use client";

import { SidebarTrigger } from "../ui/sidebar";

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 flex h-[40px] w-screen items-center justify-between border-border border-t bg-background text-foreground">
      <SidebarTrigger />
      <p className="mr-5 text-muted-foreground">tramus</p>
    </footer>
  );
}
