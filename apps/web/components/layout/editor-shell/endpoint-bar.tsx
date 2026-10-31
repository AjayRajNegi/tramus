import { cn } from "cn";
import { PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAddDraftTab } from "@/hooks/use-add-draft-tab";
import { useEditorState } from "@/lib/store/editor.store";

export default function EndpointBar() {
  const { drafts, setActiveId, activeId, closeTab } = useEditorState();

  const addDraftTab = useAddDraftTab();
  const activeTab = useEditorState((s) =>
    s.tabs.find((t) => t.id === s.activeId),
  );

  return (
    <div className="flex items-center bg-muted">
      {Object.entries(drafts).map(([id, _draft]) => {
        const isActive = id === activeId;

        return (
          <Button
            className={cn(
              "group rounded-none border-0 p-2 py-4 text-xs shadow-none",
              isActive
                ? "bg-background text-foreground hover:bg-background hover:text-foreground dark:hover:bg-background"
                : "bg-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground dark:hover:bg-background/60",
            )}
            key={id}
            onClick={() => setActiveId(id)}
            variant="ghost"
          >
            {id}
            <span
              aria-label={`Close ${id}`}
              className={cn(
                "ml-4 cursor-pointer rounded-sm text-muted-foreground transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "opacity-100"
                  : "opacity-0 focus-visible:opacity-100 group-hover:opacity-100",
              )}
              onClick={(e) => {
                e.stopPropagation();
                closeTab(id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  closeTab(id);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <XIcon className="size-3.5" />
            </span>
          </Button>
        );
      })}
      <Button
        aria-label="New request"
        className="text-muted-foreground hover:text-foreground"
        onClick={() =>
          addDraftTab({
            scenarioId: activeTab?.scenarioId ?? "",
            workspaceId: activeTab?.workspaceId ?? "",
          })
        }
        size="icon"
        variant="ghost"
      >
        <PlusIcon className="size-4" />
      </Button>
    </div>
  );
}
