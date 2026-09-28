"use client";

import Link from "next/link";
import { ModeToggle } from "@/components/layout/mode-toggle";

export function Header() {
  return (
    <nav className="fixed top-0 left-0 flex h-[70px] w-screen items-center justify-end gap-3 bg-background px-4 text-foreground">
      <Link className="underline underline-offset-2" href="/w">
        Workspace
      </Link>
      <ModeToggle />
    </nav>
  );
}
