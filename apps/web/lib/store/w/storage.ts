import { del as idbDel, get as idbGet, set as idbSet } from "idb-keyval";
import { createJSONStorage, type StateStorage } from "zustand/middleware";

const memory = new Map<string, string>();

const memoryStorage: StateStorage = {
  getItem: (name) => memory.get(name) ?? null,
  removeItem: (name) => void memory.delete(name),
  setItem: (name, value) => void memory.set(name, value),
};

const idbStorage: StateStorage = {
  getItem: async (name) => (await idbGet<string>(name)) ?? null,
  removeItem: async (name) => idbDel(name),
  setItem: async (name, value) => idbSet(name, value),
};

/**
 * Everything lives under one key now, so writing on every keystroke would
 * rewrite the whole blob. Coalesce writes and flush when the page is hidden.
 */
function debounced(base: StateStorage, delay: number): StateStorage {
  const pending = new Map<string, string>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  const cancel = (name: string) => {
    clearTimeout(timers.get(name));
    timers.delete(name);
  };

  const flush = async (name: string) => {
    cancel(name);
    const value = pending.get(name);
    if (value === undefined) return;
    pending.delete(name);
    await base.setItem(name, value);
  };

  if (typeof window !== "undefined") {
    const flushAll = () => {
      for (const name of [...pending.keys()]) void flush(name);
    };
    window.addEventListener("pagehide", flushAll);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushAll();
    });
  }

  return {
    getItem: (name) => pending.get(name) ?? base.getItem(name),
    removeItem: (name) => {
      pending.delete(name);
      cancel(name);
      return base.removeItem(name);
    },
    setItem: (name, value) => {
      pending.set(name, value);
      cancel(name);
      timers.set(
        name,
        setTimeout(() => void flush(name), delay),
      );
    },
  };
}

export const createWorkspaceStorage = <S>() =>
  createJSONStorage<S>(() =>
    typeof indexedDB !== "undefined"
      ? debounced(idbStorage, 300)
      : memoryStorage,
  );
