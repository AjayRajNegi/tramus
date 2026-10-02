import type { Draft } from "immer";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { shallow } from "zustand/shallow";

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

type EndpointDraft = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  headers: KeyValue[];
  params: KeyValue[];
  body: {
    type: "none" | "json" | "form" | "raw";
    content: string;
  };
  authorization: {
    type: "none" | "bearer" | "basic";
    token?: string;
  };
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
    activeId: null,

    closeTab: (id) => {
      set((state) => {
        const index = state.tabs.findIndex((tab) => tab.id === id);

        if (index === -1) {
          return;
        }

        state.tabs.splice(index, 1);

        delete state.drafts[id];

        // If closing the active tab, select another tab.
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
    drafts: {},

    // --------------------------------
    // Draft lifecycle
    // --------------------------------

    ensureDraft: (id, base) => {
      set((state) => {
        // If draft already exists, don't overwrite
        // the user's current edits.
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

        // The saved server version is now both:
        //
        // draft    = what we're displaying
        // baseline = what we're comparing against
        //
        entry.draft = structuredClone(saved);
        entry.baseline = structuredClone(saved);

        entry.status = "saved";
        entry.error = undefined;
      });
    },

    // --------------------------------
    // Tabs
    // --------------------------------

    openTab: (tab) => {
      set((state) => {
        // Don't open the same tab twice.
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

        // If a new base was supplied, use it.
        // Otherwise reset to the current baseline.
        const resetTo = base ?? entry.baseline;

        entry.draft = structuredClone(resetTo);

        // If `base` was supplied, it becomes the new baseline.
        if (base) {
          entry.baseline = structuredClone(base);
        }

        entry.status = "idle";
        entry.error = undefined;
      });
    },

    setActiveId: (id) => {
      set((state) => {
        state.activeId = id;
      });
    },

    // --------------------------------
    // Save status
    // --------------------------------

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
    tabs: [],

    updateDraft: (id, recipe) => {
      set((state) => {
        const entry = state.drafts[id];

        if (!entry) {
          return;
        }

        // `recipe` is the function supplied by the component.
        recipe(entry.draft);

        // Since the user changed the draft,
        // clear the previous error.
        entry.error = undefined;

        // If we previously had "saved", we're editing again.
        if (entry.status === "saved") {
          entry.status = "idle";
        }
      });
    },
  })),
);

// --------------------------------
// Selectors
// --------------------------------

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
