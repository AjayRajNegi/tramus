// lib/query-keys.ts
export const queryKeys = {
  workspaces: {
    all: ["workspaces"] as const,
    detail: (workspaceId: string) =>
      [...queryKeys.workspaces.details(), workspaceId] as const,
    details: () => [...queryKeys.workspaces.all, "detail"] as const,
    endpoints: (workspaceId: string) =>
      [...queryKeys.workspaces.detail(workspaceId), "endpoint"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.workspaces.lists(), filters] as const,
    lists: () => [...queryKeys.workspaces.all, "list"] as const,
    scenarios: (workspaceId: string) =>
      [...queryKeys.workspaces.detail(workspaceId), "scenarios"] as const,
  },
} as const;
