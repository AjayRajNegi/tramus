import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UrlBar } from "./url-bar";

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
            {/* <KeyValueEditor field="params" /> */}
          </TabsContent>
          <TabsContent className="p-3" value="headers">
            {/* <KeyValueEditor field="headers" /> */}
          </TabsContent>
          {/* body, auth, docs */}
        </ScrollArea>
      </Tabs>
    </div>
  );
}
