import { cn } from "cn";
import { PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { selectActiveWorkspace, selectTabs } from "@/lib/store/w/selectors";
import { useWorkspaceStore } from "@/lib/store/w/workspace.store";

export default function EndpointBar() {
  const ws = useWorkspaceStore(selectActiveWorkspace);
  const tabs = useWorkspaceStore((s) => selectTabs(s.activeWorkspaceId)(s));

  const openTab = useWorkspaceStore((s) => s.openTab);
  const closeTab = useWorkspaceStore((s) => s.closeTab);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const createEndpoint = useWorkspaceStore((s) => s.createEndpoint);

  if (!ws) return null;

  const addDraftTab = () => {
    const endpointId = createEndpoint(ws.id, {
      definition: {
        authorization: {
          password: "",
          token: "",
          type: "none",
          username: "",
        },
        body: {
          file: null,
          form: [],
          formData: [],
          json: "",
          raw: "",
          type: "none",
        },
        headers: [],
        method: "GET",
        params: [],
        path: "http://localhost:3000",
        url: "http://localhost:3000",
      },
    });
    openTab(ws.id, {
      endpointId,
      scenarioId: ws.activeScenarioId,
    });
  };

  return (
    <div className="flex items-center bg-muted">
      {tabs.map((tab) => {
        const isActive = tab.id === ws.activeTabId;
        const endpoint = ws.endpoints[tab.endpointId];

        return (
          <Button
            className={cn(
              "group rounded-none border-0 p-2 py-4 text-xs shadow-none",
              isActive
                ? "bg-background text-foreground hover:bg-background hover:text-foreground dark:hover:bg-background"
                : "bg-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground dark:hover:bg-background/60",
            )}
            key={tab.id}
            onClick={() => setActiveTab(ws.id, tab.id)}
            variant="ghost"
          >
            {endpoint?.name.split(" ")[1] ?? tab.id}
            <span
              aria-label={`Close ${tab.id}`}
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
                closeTab(ws.id, tab.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  closeTab(ws.id, tab.id);
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
        onClick={addDraftTab}
        size="icon"
        variant="ghost"
      >
        <PlusIcon className="size-4" />
      </Button>
    </div>
  );
}
