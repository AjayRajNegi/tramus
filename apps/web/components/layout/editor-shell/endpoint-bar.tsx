import { cn } from "cn";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEditorState } from "@/lib/store/editor.store";

export default function EndpointBar() {
  const { drafts, setActiveId, activeId, closeTab } = useEditorState();

  return (
    <div className="flex items-center bg-secondary">
      {Object.entries(drafts).map(([id, draft]) => (
        <Button
          className={cn(
            "group border-0 p-2 py-4 text-xs",
            id === activeId
              ? "bg-background hover:bg-background"
              : "bg-secondary hover:bg-secondary",
          )}
          key={id}
          onClick={() => setActiveId(id)}
        >
          {id}
          <span
            aria-label={`Close ${id}`}
            className={cn(
              "ml-4 cursor-pointer transition-colors group-hover:text-foreground",
              id === activeId ? "text-background" : "text-secondary",
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
      ))}
      <p className="ml-2 cursor-pointer bg-secondary">+</p>
    </div>
  );
}
