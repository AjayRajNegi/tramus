"use client";

import { Input } from "@/components/ui/input";
// import { useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEditorState } from "@/lib/store/editor.store";
import { AuthorizationEditor, createAuthorization } from "./auth-editor";
import { BodyEditor, createBody } from "./body-editor";
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

export const MOCK_BODY = [{ enabled: true, id: "p1", key: "page", value: "1" }];

export function RequestPane() {
  const { drafts, activeId, updateDraft } = useEditorState();

  const draft = activeId ? drafts[activeId]?.draft : undefined;

  const EMPTY_BODY = createBody();
  const EMPTY_AUTH = createAuthorization();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <UrlBar />
      <Tabs
        className="mt-3 flex min-h-0 flex-1 flex-col gap-0"
        defaultValue="params"
      >
        <TabsList className="mx-5 w-fit gap-5 bg-background pb-1">
          <TabsTrigger className="p-0" value="params">
            Params
          </TabsTrigger>
          <TabsTrigger className="p-0" value="headers">
            Headers
          </TabsTrigger>
          <TabsTrigger className="p-0" value="body">
            Body
          </TabsTrigger>
          <TabsTrigger className="p-0" value="auth">
            Auth
          </TabsTrigger>
        </TabsList>
        <ScrollArea className="min-h-0 flex-1">
          <TabsContent value="params">
            <KeyValueEditor
              onChange={(rows) => {
                activeId &&
                  updateDraft(activeId, (d) => {
                    d.params = rows;
                  });
              }}
              rows={draft?.params ?? MOCK_PARAMS}
            />
          </TabsContent>
          <TabsContent value="headers">
            <KeyValueEditor
              onChange={(rows) => {
                activeId &&
                  updateDraft(activeId, (d) => {
                    d.headers = rows;
                  });
              }}
              rows={draft?.headers ?? MOCK_HEADERS}
            />
          </TabsContent>
          <TabsContent value="body">
            <BodyEditor
              onChange={(value) => {
                activeId &&
                  updateDraft(activeId, (d) => {
                    d.body = value;
                  });
              }}
              value={draft?.body ?? EMPTY_BODY}
            />
          </TabsContent>
          <TabsContent value="auth">
            <AuthorizationEditor
              onChange={(authorization) =>
                activeId &&
                updateDraft(activeId, (d) => {
                  d.authorization = authorization;
                })
              }
              value={draft?.authorization ?? EMPTY_AUTH}
            />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
