import type { Draft } from "immer";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { shallow } from "zustand/shallow";
import type {
  HttpResponse,
  RequestFailure,
  ResponseState,
} from "./store-types";

const DEMO_TABS: Tab[] = [
  {
    endpointId: "endpoint-1",
    id: "tab-1",
    scenarioId: "scenario-1",
    workspaceId: "workspace-1",
  },
];
const DEMO_DRAFT: Record<TabId, DraftEntry> = {
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
      params: [],
      path: "/users",

      url: "http://localhost:8000/users",
    },
    error: undefined,
    status: "idle",
  },
};

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
  responses: Record<string, ResponseState>;

  startRequest: (id: string, requestId: string) => void;
  setResponse: (id: string, response: HttpResponse) => void;
  setFailure: (id: string, failure: RequestFailure) => void;
  clearResponse: (id: string) => void;

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

    clearResponse: (id) => {
      set((state) => {
        revokeBodyUrl(state.responses[id]);
        delete state.responses[id];
      });
    },

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

    drafts: DEMO_DRAFT,

    // Draft lifecycle
    ensureDraft: (id, base) => {
      set((state) => {
        if (state.drafts[id]) {
          return;
        }

        const normalized = {
          ...base,
          url: buildUrl(base.url, base.params),
        };

        state.drafts[id] = {
          baseline: structuredClone(normalized),
          draft: structuredClone(normalized),
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

    // Responses
    responses: {},

    setActiveId: (id) =>
      set((state) => {
        if (id !== null && !state.tabs.some((t) => t.id === id)) return;
        state.activeId = id;
      }),

    setFailure: (id, failure) => {
      set((state) => {
        const current = state.responses[id];

        if (current?.phase !== "loading" || current.requestId !== failure.id) {
          return;
        }

        state.responses[id] = { failure, phase: "error" };
      });
    },

    setResponse: (id, response) => {
      set((state) => {
        const current = state.responses[id];

        if (current?.phase !== "loading" || current.requestId !== response.id) {
          // console.log("setResponse return");
          return;
        }

        // console.log("setResponse", response);

        state.responses[id] = { phase: "success", response };
      });
    },

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

    startRequest: (id, requestId) => {
      set((state) => {
        revokeBodyUrl(state.responses[id]);

        state.responses[id] = {
          phase: "loading",
          requestId,
          startedAt: Date.now(),
        };
        // console.log("startRequest", id, requestId);
      });
    },

    tabs: DEMO_TABS,

    updateDraft: (id, recipe) => {
      set((state) => {
        const entry = state.drafts[id];

        if (!entry) {
          return;
        }

        recipe(entry.draft);

        entry.draft.url = buildUrl(entry.draft.url, entry.draft.params);

        entry.error = undefined;

        if (entry.status === "saved") {
          entry.status = "idle";
        }
      });
    },
  })),
);

/* -------------------------------------------------------------------------- */
/* 4. Selectors                                                               */
/* -------------------------------------------------------------------------- */

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

type EditorStateLike = { responses: Record<string, ResponseState> };

export const selectResponseState =
  (id: string) =>
  (state: EditorStateLike): ResponseState =>
    state.responses[id] ?? { phase: "idle" };

export const selectIsSending = (id: string) => (state: EditorStateLike) =>
  state.responses[id]?.phase === "loading";

/* -------------------------------------------------------------------------- */
/* 5. Helpers                                                                 */
/* -------------------------------------------------------------------------- */

const revokeBodyUrl = (entry: ResponseState | undefined) => {
  if (entry?.phase !== "success") return;

  const { body } = entry.response;

  if ("objectUrl" in body) {
    URL.revokeObjectURL(body.objectUrl);
  }
};

const inFlight = new Map<string, AbortController>();

export const registerRequest = (tabId: string, controller: AbortController) => {
  inFlight.get(tabId)?.abort();
  inFlight.set(tabId, controller);
};

const buildUrl = (url: string, params: KeyValue[]): string => {
  const [withoutHash, hash = ""] = url.split("#");
  const [base] = withoutHash.split("?");

  const query = params
    .filter((p) => p.enabled && p.key.trim() !== "")
    .map(
      (p) =>
        `${encodeURIComponent(p.key.trim())}=${encodeURIComponent(p.value)}`,
    )
    .join("&");

  return `${base}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
};
