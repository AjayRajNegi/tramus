import { Button } from "@/components/ui/button";
import { useEditorState } from "@/lib/store/editor.store";

export default function EndpointBar() {
  const { drafts, setActiveId, activeId } = useEditorState();

  return (
    <div className="flex gap-2 p-4 pb-0">
      {Object.entries(drafts).map(([id, draft]) => (
        <Button
          key={id}
          onClick={() => setActiveId(id)}
          variant={id === activeId ? "secondary" : "default"}
        >
          Hello {id}
        </Button>
      ))}
      <Button>+</Button>
    </div>
  );
}
