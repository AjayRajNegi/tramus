import type { Draft } from "immer";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { shallow } from "zustand/shallow";

const DEMO_TABS: Tab[] = [
  {
    endpointId: "endpoint-1",
    id: "tab-1",
    scenarioId: "scenario-1",
    workspaceId: "workspace-1",
  },
  {
    endpointId: "endpoint-2",
    id: "tab-2",
    scenarioId: "scenario-2",
    workspaceId: "workspace-2",
  },
  {
    endpointId: "endpoint-3",
    id: "tab-3",
    scenarioId: "scenario-3",
    workspaceId: "workspace-3",
  },
];

type TabId = string;

type Tab = {
  id: TabId;
  endpointId: string;
  scenarioId: string;
  workspaceId: string;
};

type KeyValue = {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
};

export type BodyType = "none" | "json" | "form" | "raw";

export type RequestBody = {
  type: BodyType;
  json: string;
  raw: string;
  form: KeyValue[];
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

type DraftEntry = {
  draft: EndpointDraft;
  baseline: EndpointDraft;
  status: "idle" | "saving" | "saved" | "error";
  error?: string;
};

type EditorState = {
  tabs: Tab[];
  activeId: TabId | null;
  drafts: Record<TabId, DraftEntry>;

  openTab: (tab: Tab) => void;
  closeTab: (id: TabId) => void;
  setActiveId: (id: TabId | null) => void;

  ensureDraft: (id: TabId, base: EndpointDraft) => void;

  updateDraft: (
    id: TabId,
    recipe: (draft: Draft<EndpointDraft>) => void,
  ) => void;

  resetDraft: (id: TabId, base?: EndpointDraft) => void;
  discardDraft: (id: TabId) => void;

  setStatus: (id: TabId, status: DraftEntry["status"], error?: string) => void;
  markSaved: (id: TabId, saved: EndpointDraft) => void;
};

export const useEditorState = create<EditorState>()(
  immer((set) => ({
    activeId: DEMO_TABS[0]?.id ?? null,

    closeTab: (id) => {
      set((state) => {
        const index = state.tabs.findIndex((tab) => tab.id === id);
        const tabsLength = state.tabs.length;

        if (index === -1) {
          return;
        }
        if (tabsLength <= 1) {
          return;
        }

        state.tabs.splice(index, 1);

        delete state.drafts[id];

        if (state.activeId === id) {
          const nextTab = state.tabs[index] ?? state.tabs[index - 1];

          state.activeId = nextTab?.id ?? null;
        }
      });
    },

    discardDraft: (id) => {
      set((state) => {
        delete state.drafts[id];
      });
    },

    drafts: {
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
          params: [
            {
              enabled: true,
              id: "h1",
              key: "page",
              value: "3",
            },
            {
              enabled: true,
              id: "h2",
              key: "take",
              value: "5",
            },
          ],
          path: "/users",
          url: "http://localhost:8000/users",
        },
        error: undefined,
        status: "idle",
      },
      //   "tab-2": {
      //     baseline: {
      //       authorization: {
      //         password: "s3cr3tP@ss!",
      //         token: "",
      //         type: "basic",
      //         username: "johndoe",
      //       },
      //       body: {
      //         form: [
      //           {
      //             enabled: true,
      //             id: "kv_001",
      //             key: "username",
      //             value: "johndoe",
      //           },
      //           {
      //             enabled: true,
      //             id: "kv_002",
      //             key: "password",
      //             value: "s3cr3tP@ss",
      //           },
      //           {
      //             enabled: true,
      //             id: "kv_003",
      //             key: "remember_me",
      //             value: "true",
      //           },
      //           {
      //             enabled: false,
      //             id: "kv_004",
      //             key: "csrf_token",
      //             value: "abc123xyz",
      //           },
      //           {
      //             enabled: true,
      //             id: "kv_005",
      //             key: "redirect_url",
      //             value: "/dashboard",
      //           },
      //         ],
      //         json: "",
      //         raw: "",
      //         type: "form",
      //       },
      //       headers: [
      //         {
      //           enabled: true,
      //           id: "h1",
      //           key: "Content-Type",
      //           value: "application/json",
      //         },
      //         {
      //           enabled: true,
      //           id: "h2",
      //           key: "Authorization",
      //           value: "Bearer {{token}}",
      //         },
      //         {
      //           enabled: true,
      //           id: "h3",
      //           key: "Accept",
      //           value: "application/json",
      //         },
      //         { enabled: false, id: "h4", key: "X-Debug", value: "true" },
      //         { enabled: true, id: "h5", key: "X-Trace-Id", value: "" },
      //         { enabled: true, id: "h6", key: "Cookie", value: "session=abc123" },
      //         { enabled: true, id: "h7", key: "Cookie", value: "theme=dark" },
      //       ],
      //       method: "POST",
      //       params: [],
      //       path: "/users",
      //       url: "http://localhost:8000/users",
      //     },
      //     draft: {
      //       authorization: {
      //         password: "s3cr3tP@ss!",
      //         token: "",
      //         type: "basic",
      //         username: "johndoe",
      //       },
      //       body: {
      //         form: [
      //           {
      //             enabled: true,
      //             id: "kv_001",
      //             key: "username",
      //             value: "johndoe",
      //           },
      //           {
      //             enabled: true,
      //             id: "kv_002",
      //             key: "password",
      //             value: "s3cr3tP@ss",
      //           },
      //           {
      //             enabled: true,
      //             id: "kv_003",
      //             key: "remember_me",
      //             value: "true",
      //           },
      //           {
      //             enabled: false,
      //             id: "kv_004",
      //             key: "csrf_token",
      //             value: "abc123xyz",
      //           },
      //           {
      //             enabled: true,
      //             id: "kv_005",
      //             key: "redirect_url",
      //             value: "/dashboard",
      //           },
      //         ],
      //         json: "",
      //         raw: "",
      //         type: "form",
      //       },
      //       headers: [
      //         {
      //           enabled: true,
      //           id: "h1",
      //           key: "Content-Type",
      //           value: "application/json",
      //         },
      //         {
      //           enabled: true,
      //           id: "h2",
      //           key: "Authorization",
      //           value: "Bearer {{token}}",
      //         },
      //         {
      //           enabled: true,
      //           id: "h3",
      //           key: "Accept",
      //           value: "application/json",
      //         },
      //         { enabled: false, id: "h4", key: "X-Debug", value: "true" },
      //         { enabled: true, id: "h5", key: "X-Trace-Id", value: "" },
      //         { enabled: true, id: "h6", key: "Cookie", value: "session=abc123" },
      //         { enabled: true, id: "h7", key: "Cookie", value: "theme=dark" },
      //       ],
      //       method: "POST",
      //       params: [],
      //       path: "/users",
      //       url: "http://localhost:8000/users",
      //     },
      //     error: undefined,
      //     status: "idle",
      //   },
      //   "tab-3": {
      //     baseline: {
      //       authorization: {
      //         password: "hunter2",
      //         token: "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      //         type: "bearer",
      //         username: "octocat",
      //       },
      //       body: {
      //         form: [],
      //         json: "",
      //         raw: `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
      //   <soap:Body>
      //     <GetUser xmlns="http://example.com/api">
      //       <UserId>usr_8f3a91b2</UserId>
      //     </GetUser>
      //   </soap:Body>
      // </soap:Envelope>`,
      //         type: "raw",
      //       },
      //       headers: [],
      //       method: "PUT",
      //       params: [],
      //       path: "/users/1",
      //       url: "http://localhost:8000/users/1",
      //     },
      //     draft: {
      //       authorization: {
      //         password: "hunter2",
      //         token: "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      //         type: "bearer",
      //         username: "octocat",
      //       },
      //       body: {
      //         form: [],
      //         json: "",
      //         raw: `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
      //   <soap:Body>
      //     <GetUser xmlns="http://example.com/api">
      //       <UserId>usr_8f3a91b2</UserId>
      //     </GetUser>
      //   </soap:Body>
      // </soap:Envelope>`,
      //         type: "raw",
      //       },
      //       headers: [],
      //       method: "PUT",
      //       params: [],
      //       path: "/users/1",
      //       url: "http://localhost:8000/users/1",
      //     },
      //     error: undefined,
      //     status: "idle",
      //   },
    },

    // Draft lifecycle
    ensureDraft: (id, base) => {
      set((state) => {
        if (state.drafts[id]) {
          return;
        }

        state.drafts[id] = {
          baseline: structuredClone(base),
          draft: structuredClone(base),
          status: "idle",
        };
      });
    },

    markSaved: (id, saved) => {
      set((state) => {
        const entry = state.drafts[id];

        if (!entry) {
          return;
        }

        entry.draft = structuredClone(saved);
        entry.baseline = structuredClone(saved);

        entry.status = "saved";
        entry.error = undefined;
      });
    },

    // Tabs
    openTab: (tab) => {
      set((state) => {
        const alreadyOpen = state.tabs.some(
          (existingTab) => existingTab.id === tab.id,
        );

        if (!alreadyOpen) {
          state.tabs.push(tab);
        }

        state.activeId = tab.id;
      });
    },

    resetDraft: (id, base) => {
      set((state) => {
        const entry = state.drafts[id];

        if (!entry) {
          return;
        }

        const resetTo = base ?? entry.baseline;
        entry.draft = structuredClone(resetTo);

        if (base) {
          entry.baseline = structuredClone(base);
        }

        entry.status = "idle";
        entry.error = undefined;
      });
    },

    setActiveId: (id) =>
      set((state) => {
        if (id !== null && !state.tabs.some((t) => t.id === id)) return;
        state.activeId = id;
      }),

    // Save status
    setStatus: (id, status, error) => {
      set((state) => {
        const entry = state.drafts[id];

        if (!entry) {
          return;
        }

        entry.status = status;
        entry.error = error;
      });
    },
    // tabs: [],
    tabs: DEMO_TABS,

    updateDraft: (id, recipe) => {
      set((state) => {
        const entry = state.drafts[id];

        if (!entry) {
          return;
        }

        recipe(entry.draft);

        entry.error = undefined;

        if (entry.status === "saved") {
          entry.status = "idle";
        }
      });
    },
  })),
);

// Selectors
export const selectIsDirty = (id: TabId) => (state: EditorState) => {
  const entry = state.drafts[id];

  if (!entry) {
    return false;
  }

  return !shallow(entry.draft, entry.baseline);
};

export const selectDraft = (id: TabId) => (state: EditorState) => {
  return state.drafts[id]?.draft;
};

export const selectDraftStatus = (id: TabId) => (state: EditorState) => {
  return state.drafts[id]?.status ?? "idle";
};
