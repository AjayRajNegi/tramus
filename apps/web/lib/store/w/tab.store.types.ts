export const DEMO_TABS: Tab[] = [
  {
    endpointId: "endpoint-1",
    id: "tab-1",
    scenarioId: "scenario-1",
    workspaceId: "workspace-1",
  },
];
export const DEMO_DRAFT: Record<TabId, DraftEntry> = {
  "tab-1": {
    baseline: {
      authorization: {
        password: "",
        token:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfOGYzYTkxYjIiLCJuYW1lIjoiSmFuZSBEb2UiLCJpYXQiOjE3MTIzNDU2Nzh9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
        type: "bearer",
        username: "",
      },
      body: {
        form: [],
        formData: [],
        json: JSON.stringify(
          {
            email: "jane.doe@example.com",
            name: "Jane Doe",
            preferences: {
              notifications: true,
              theme: "dark",
            },
            roles: ["admin", "editor"],
            userId: "usr_8f3a91b2",
          },
          null,
          2,
        ),
        raw: "",
        type: "json",
      },
      headers: [],
      method: "GET",
      params: [],
      path: "/users",
      url: "http://localhost:8000/users",
    },
    draft: {
      authorization: {
        password: "",
        token:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfOGYzYTkxYjIiLCJuYW1lIjoiSmFuZSBEb2UiLCJpYXQiOjE3MTIzNDU2Nzh9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
        type: "bearer",
        username: "",
      },
      body: {
        form: [],
        formData: [],
        json: JSON.stringify(
          {
            email: "jane.doe@example.com",
            name: "Jane Doe",
            preferences: {
              notifications: true,
              theme: "dark",
            },
            roles: ["admin", "editor"],
            userId: "usr_8f3a91b2",
          },
          null,
          2,
        ),
        raw: "",
        type: "json",
      },
      headers: [
        {
          enabled: true,
          id: "h1",
          key: "Content-Type",
          value: "application/json",
        },
        {
          enabled: true,
          id: "h2",
          key: "Authorization",
          value: "Bearer {{token}}",
        },
        {
          enabled: true,
          id: "h3",
          key: "Accept",
          value: "application/json",
        },
        { enabled: false, id: "h4", key: "X-Debug", value: "true" },
        { enabled: true, id: "h5", key: "X-Trace-Id", value: "" },
        { enabled: true, id: "h6", key: "Cookie", value: "session=abc123" },
        { enabled: true, id: "h7", key: "Cookie", value: "theme=dark" },
      ],
      method: "GET",
      params: [],
      path: "/users",

      url: "http://localhost:8000/users",
    },
    error: undefined,
    status: "idle",
  },
};

export type TabId = string;

export type Tab = {
  id: TabId;
  endpointId: string;
  scenarioId: string;
  workspaceId: string;
};

export type KeyValue = {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
};

export type BodyType = "none" | "json" | "form" | "raw" | "file" | "formdata";

export type FileValue = {
  name: string;
  type: string;
  size: number;
  base64: string;
};

export type FormDataRow = {
  id: string;
  key: string;
  enabled: boolean;
  kind: "text" | "file";
  text: string;
  files: FileValue[];
};

export type RequestBody = {
  type: BodyType;
  json: string;
  raw: string;
  form: KeyValue[];
  file?: FileValue | null;
  formData: FormDataRow[];
};

export type AuthType = "none" | "bearer" | "basic";

export type Authorization = {
  type: AuthType;
  token: string;
  username: string;
  password: string;
};

export type EndpointDraft = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  headers: KeyValue[];
  params: KeyValue[];
  body: RequestBody;
  authorization: Authorization;
  url: string;
};

export type DraftEntry = {
  draft: EndpointDraft;
  baseline: EndpointDraft;
  status: "idle" | "saving" | "saved" | "error";
  error?: string;
};
