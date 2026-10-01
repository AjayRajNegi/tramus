import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type KeyValue, KeyValueEditor } from "./key-value-editor";
import { UrlBar } from "./url-bar";

export const MOCK_HEADERS: KeyValue[] = [
  { enabled: true, id: "h1", key: "Content-Type", value: "application/json" },
  { enabled: true, id: "h2", key: "Authorization", value: "Bearer {{token}}" },
  { enabled: true, id: "h3", key: "Accept", value: "application/json" },
  { enabled: false, id: "h4", key: "X-Debug", value: "true" }, // disabled row
  { enabled: true, id: "h5", key: "X-Trace-Id", value: "" }, // empty value
  { enabled: true, id: "h6", key: "Cookie", value: "session=abc123" },
  { enabled: true, id: "h7", key: "Cookie", value: "theme=dark" }, // duplicate key
];

export const MOCK_PARAMS: KeyValue[] = [
  { enabled: true, id: "p1", key: "page", value: "1" },
  { enabled: true, id: "p2", key: "limit", value: "20" },
  { enabled: true, id: "p3", key: "sort", value: "created_at" },
  { enabled: false, id: "p4", key: "filter", value: "status:active" },
];

export function RequestPane() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <UrlBar />
      <Tabs className="flex min-h-0 flex-1 flex-col" defaultValue="params">
        <TabsList className="mx-3 w-fit">
          <TabsTrigger value="params">Params</TabsTrigger>
          <TabsTrigger value="headers">Headers</TabsTrigger>
          <TabsTrigger value="body">Body</TabsTrigger>
          <TabsTrigger value="auth">Auth</TabsTrigger>
          <TabsTrigger value="docs">Docs</TabsTrigger>
        </TabsList>
        <ScrollArea className="min-h-0 flex-1">
          <TabsContent className="p-3" value="params">
            <KeyValueEditor
              onChange={() => {
                console.log("updated");
              }}
              rows={MOCK_HEADERS}
            />
          </TabsContent>
          <TabsContent className="p-3" value="body">
            {/* <KeyValueEditor field="headers" /> */}
            <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(MOCK_PARAMS, null, 2)}
            </pre>
          </TabsContent>
          {/* body, auth, docs */}
        </ScrollArea>
      </Tabs>
    </div>
  );
}
