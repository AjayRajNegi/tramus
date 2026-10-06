"use client";

import { useState } from "react";

import {
  type KeyValue,
  KeyValueEditor,
} from "@/components/layout/editor-shell/key-value-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEditorState } from "@/lib/store/editor.store";

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

export default function Playground() {
  const [headers, setHeaders] = useState(MOCK_HEADERS);

  const { openTab } = useEditorState();

  function openTabs() {
    const tab = {
      endpointId: crypto.randomUUID(),
      id: crypto.randomUUID(),
      scenarioId: crypto.randomUUID(),
      workspaceId: crypto.randomUUID(),
    };
    openTab(tab);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8">
      <Card>
        <CardHeader>
          <CardTitle>Store actions</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={openTabs}>Open tabs</Button>
        </CardContent>
      </Card>
      <section className="space-y-2">
        <h2 className="font-medium text-sm">Headers</h2>
        <KeyValueEditor onChange={setHeaders} rows={headers} />
      </section>
    </div>
  );
}
