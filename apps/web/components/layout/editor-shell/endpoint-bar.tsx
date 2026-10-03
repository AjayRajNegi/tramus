import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { useEditorState } from "@/lib/store/editor.store";

export default function EndpointBar() {
  const { drafts, setActiveId, activeId } = useEditorState();

  return (
    <div className="flex gap-2">
      {Object.entries(drafts).map(([id, draft]) => (
        <Button
          className={cn(
            "border-0 p-4 py-6",
            id === activeId
              ? "bg-background hover:bg-background"
              : "bg-secondary",
          )}
          key={id}
          onClick={() => setActiveId(id)}
          // variant={id !== activeId ? "default" : "default"}
        >
          Hello {id}
        </Button>
      ))}
      <Button>+</Button>
    </div>
  );
}
