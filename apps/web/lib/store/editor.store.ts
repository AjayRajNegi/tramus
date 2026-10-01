import type { Draft } from "immer";
import { create } from "zustand";
import { shallow as shallowEqual } from "zustand/shallow";

type TabId = string;

type Tab = {
  id: TabId;
  endpointId: string;
  scenarioId: string;
  workspaceId: string;
};

type DraftEntry = {
  draft: EndpointDraft;
  baseline: EndpointDraft;
  status: "idle" | "saving" | "saved" | "error";
  error?: string;
};

type EndpointDraft = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  headers: KeyValue[];
  params: KeyValue[];
  body: { type: "none" | "json" | "form" | "raw"; content: string };
  authorization: { type: "none" | "bearer" | "basic"; token?: string };
};

type KeyValue = {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
};

type EditorState = {
  tabs: Tab[];
  activeId: TabId | null;
  drafts: Record<TabId, DraftEntry>;

  openTab: (tab: Tab) => void;
  closeTab: (id: TabId) => void;
  setActiveId: (id: TabId) => void;

  // ensureDraft: (id: TabId, base: EndpointDraft) => void;
  // updateDraft: (id: TabId, recipe: (d: Draft<EndpointDraft>) => void) => void;
  // resetDraft: (id: TabId, base: EndpointDraft) => void;
  // discardDraft: (id: TabId) => void;

  // setStatus: (id: TabId, status: DraftEntry["status"], error?: string) => void;
  // markSaved: (id: TabId, saved: EndpointDraft) => void;
};

export const selectIsDirty = (id: TabId) => (s: EditorState) => {
  const e = s.drafts[id];
  return !!e && !shallowEqual(e.draft, e.baseline);
};

export const useEditorState = create<EditorState>((set) => ({
  activeId: "",
  closeTab: async (id) => {
    console.log(id);
  },
  drafts: {},
  // ensureDraft: async (id, base) => {},
  openTab: (tab) => {
    set((draft) => ({ tabs: [...draft.tabs, tab] }));
  },

  setActiveId: async (id) => {
    set({ activeId: "1234513" });
  },
  tabs: [],
  // updateDraft: async (id, recipe) => {},
}));
