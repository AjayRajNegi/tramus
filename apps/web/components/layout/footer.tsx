import { PanelLeftIcon, PanelRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "./mode-toggle";

export function Footer({
  onToggleLeft,
  onToggleRight,
}: {
  onToggleLeft: () => void;
  onToggleRight: () => void;
}) {
  return (
    <footer className="fixed bottom-0 left-0 z-20 flex h-[40px] w-screen items-center justify-between border-border border-t bg-background text-foreground">
      <div className="flex items-center gap-1 pl-2">
        <Button
          aria-label="Toggle left sidebar"
          onClick={onToggleLeft}
          size="icon"
          variant="ghost"
        >
          <PanelLeftIcon className="size-4" />
        </Button>
        <ModeToggle />
      </div>

      <div className="flex items-center gap-3 pr-2">
        <p className="text-muted-foreground">tramus</p>
        <Button
          aria-label="Toggle right sidebar"
          onClick={onToggleRight}
          size="icon"
          variant="ghost"
        >
          <PanelRightIcon className="size-4" />
        </Button>
      </div>
    </footer>
  );
}
