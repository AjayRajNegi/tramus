# React Query Caching and Optimization

This document describes how **TanStack Query (React Query) v5** is used in `apps/web`, based only on code in that package. Proposed changes are labeled as recommendations; they are not implemented.

**Scope:** `apps/web` only  
**Library:** `@tanstack/react-query` `^5.103.2`  
**App Router:** Next.js `16.3.5` with React `19.2.8`  
**Not present:** mutations, infinite queries, query key factories, Devtools, persist clients, `queryOptions()`, custom retry/gcTime, optimistic updates

---

## 1. Current React Query Setup

### 1.1 Dependency and integration surface

| Item | Location | Notes |
| --- | --- | --- |
| Package | `apps/web/package.json` | `@tanstack/react-query` `^5.103.2`. No `@tanstack/react-query-devtools`, no persist packages. |
| Provider | `apps/web/app/layout.tsx` | Root layout wraps the entire app in `ReactQueryProvider`. |
| Client factory | `apps/web/provider/get-query-client.ts` | Shared `QueryClient` factory for RSC prefetch and the browser provider. |
| Provider component | `apps/web/provider/QueryProvider.tsx` | Client component; `QueryClientProvider` only. |
| Data access | `apps/web/lib/actions/dal.ts` | `"use server"` Prisma helpers used as `queryFn` values. |

Public routes under `app/(public)/` do not use React Query. All query usage lives under `app/w/`.

### 1.2 Query client configuration

```1:22:apps/web/provider/get-query-client.ts
import { isServer, QueryClient } from "@tanstack/react-query";
import { cache } from "react";

const makeQueryClient = cache(() => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });
});

let browerQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  }
  if (!browerQueryClient) browerQueryClient = makeQueryClient();
  return browerQueryClient;
}
```

**What is configured**

- `queries.staleTime`: **60 seconds** (global default).
- Server vs browser: `isServer` creates a client via `makeQueryClient()`; the browser keeps a module singleton (`browerQueryClient`).

**What is not configured (v5 defaults apply)**

| Option | Effective default (v5) | Configured in this app? |
| --- | --- | --- |
| `gcTime` | 5 minutes | No |
| `retry` | 3 for queries | No |
| `retryDelay` | Exponential backoff | No |
| `refetchOnWindowFocus` | `true` | No |
| `refetchOnReconnect` | `true` | No |
| `refetchOnMount` | `true` if stale | No |
| `refetchInterval` | `false` | No |
| Mutations defaults | n/a | No mutations exist |
| `throwOnError` | `false` | No |

The 60s `staleTime` matches TanStack Query’s usual App Router guidance: after hydration, the client should not immediately refetch the same data the server just prefetched.

The provider is a thin wrapper:

```1:13:apps/web/provider/QueryProvider.tsx
"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "./get-query-client";

export default function ReactQueryProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const client = getQueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

`getQueryClient()` is called during render. On the browser this is safe because of the singleton. `ReactQueryProvider` is mounted once from the root layout.

### 1.3 Per-request client: `cache()` plus nested dehydration

`makeQueryClient` is wrapped in React `cache()`. On the **server**, `cache()` memoizes one `QueryClient` per RSC request, so nested layouts that call `getQueryClient()` share the same in-memory cache.

That is useful for prefetch reuse **and** costly for payload size: every nested `HydrationBoundary` calls `dehydrate(queryClient)` on that **shared** client, so already-prefetched parent queries can be serialized again at each nested boundary.

`cache()` is a Server Component API. `get-query-client.ts` has no `"use client"` directive, but it is imported by `QueryProvider.tsx` (`"use client"`), so the same module is bundled for the client. The browser singleton is what actually preserves cache across navigations in the SPA-like client session.

### 1.4 Data layer used as `queryFn`

All live fetchers are server actions in `apps/web/lib/actions/dal.ts`:

| Function | Prisma operation | Used by |
| --- | --- | --- |
| `getWorkspaces()` | `workspace.findMany` filtered by a **hardcoded** `ownerId` | `app/w/layout.tsx`, `app/w/page.tsx` |
| `getScenarios(id)` | `scenario.findMany` by `workspaceId`, includes `endpoints: { select: { id: true } }` | `app/w/[workspaceId]/layout.tsx`, `app/w/[workspaceId]/page.tsx`, `app/w/[workspaceId]/[scenarioId]/page.tsx` |
| `getEndpoints(id)` | `endpoint.findMany` by `scenarioId` | `app/w/[workspaceId]/[scenarioId]/layout.tsx` **only** (prefetch) |
| `getEndpointsData(id)` | `endpoint.findFirst` by id, selected fields | `app/w/[workspaceId]/[scenarioId]/[endpointId]/layout.tsx`, matching `page.tsx` |

Commented-out user/post helpers in the same file are unused.

Because these functions are `"use server"`:

- **RSC prefetch** runs them on the server during layout render (direct DB via Prisma).
- **Client `useQuery`** after hydration uses the dehydrated cache first.
- **Refetch** (focus, reconnect, stale mount) invokes the same functions as **server actions** (network round-trip), not a REST route.

There is no HTTP API client, no `fetch` in query functions, and no shared `queryOptions` object. Each layout/page inlines `queryKey` + `queryFn`.

### 1.5 SSR, prefetch, and hydration (actual route tree)

Pattern: **async Server Component layout** → `prefetchQuery` → `HydrationBoundary` + `dehydrate` → **client page** `useQuery` with the same (intended) key.

```
app/layout.tsx                         QueryClientProvider (client)
  app/w/layout.tsx                     prefetch ["workspaces"]
    app/w/page.tsx                     useQuery ["workspaces"]
    app/w/[workspaceId]/layout.tsx     prefetch ["scenarios", workspaceId]
      app/w/[workspaceId]/page.tsx     useQuery ["scenarios", uuid from path]
      app/w/[workspaceId]/[scenarioId]/layout.tsx
                                       prefetch ["endpoints", endpointId]  ← see bugs
        app/w/[workspaceId]/[scenarioId]/page.tsx
                                       useQuery ["scenarios", uuid]        ← mismatch
        app/w/[workspaceId]/[scenarioId]/[endpointId]/layout.tsx
                                       prefetch ["endpoint", endpointId]
          .../page.tsx                 useQuery ["endpoint", uuid from path]
```

**Workspaces (aligned)**

- Layout: `queryKey: ["workspaces"]`, `queryFn: getWorkspaces`
- Page: same key and fn
- Path id is not part of the key (owner is hardcoded in `dal.ts`)

**Scenarios at workspace (aligned if pathname parsing is correct)**

- Layout: `queryKey: ["scenarios", workspaceId]` from `params`
- Page: `queryKey: ["scenarios", uuid]` where `uuid = usePathname().split("/")[2]`  
  For `/w/<workspaceId>` that index is the workspace id, so it matches.

**Endpoints list at scenario (not consumed; params are wrong)**

```1:25:apps/web/app/w/[workspaceId]/[scenarioId]/layout.tsx
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getEndpoints } from "@/lib/actions/dal";
import { getQueryClient } from "@/provider/get-query-client";

export default async function ScenarioLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ endpointId: string }>;
}) {
  const { endpointId } = await params;
  // ...
  await queryClient.prefetchQuery({
    queryFn: () => getEndpoints(endpointId),
    queryKey: ["endpoints", endpointId],
  });
```

The segment folder is `[scenarioId]`. Next.js `params` therefore expose `scenarioId`, not `endpointId`. `endpointId` is `undefined` at this layout. Prefetch runs `getEndpoints(undefined)` and caches `["endpoints", undefined]`.

No client component calls `useQuery` with `["endpoints", ...]`. The prefetch is **orphaned**.

**Scenario page (wrong key, wrong id, wrong fetcher vs layout)**

```7:19:apps/web/app/w/[workspaceId]/[scenarioId]/page.tsx
  const path = usePathname();
  const uuid = path.split("/")[1];

  const { data, isPending, isError } = useQuery({
    queryFn: () => getScenarios(uuid),
    queryKey: ["scenarios", uuid],
  });
  // ...
  redirect(`/w/${uuid}/${data[0].id}/${data[0].endpoints[0].id}`);
```

For `/w/<workspaceId>/<scenarioId>`, `split("/")[1]` is `"w"`, not a workspace or scenario id. The query is `["scenarios", "w"]`, which **does not** match the workspace layout’s `["scenarios", workspaceId]` and **does not** match the scenario layout’s `["endpoints", ...]`. Hydration cannot reuse either prefetch. The page then `redirect()`s using that result.

**Endpoint detail (aligned if pathname has four segments after the leading empty string)**

- Layout: `["endpoint", endpointId]` from `params`
- Page: `uuid = pathname.split("/")[4]` on `/w/:workspaceId/:scenarioId/:endpointId` → endpoint id
- Fetcher: `getEndpointsData`

### 1.6 Query and mutation implementations

**Queries in use**

| Query key | `queryFn` | Prefetch | Consume |
| --- | --- | --- | --- |
| `["workspaces"]` | `getWorkspaces` | `app/w/layout.tsx` | `app/w/page.tsx` |
| `["scenarios", id]` | `() => getScenarios(id)` | `app/w/[workspaceId]/layout.tsx` | workspace page (and scenario page with a different `id`) |
| `["endpoints", id]` | `() => getEndpoints(id)` | scenario layout only | **none** |
| `["endpoint", id]` | `() => getEndpointsData(id)` | endpoint layout | endpoint page |

**Not implemented anywhere in `apps/web`**

- `useMutation` / `useMutationState`
- `useInfiniteQuery` / `useSuspenseInfiniteQuery`
- `useQueries` / `useSuspenseQueries`
- `useQueryClient`, `invalidateQueries`, `setQueryData`, `removeQueries`
- `prefetchInfiniteQuery`, `ensureQueryData`
- Optimistic updates (`onMutate` / `onError` rollback)
- `placeholderData` / `keepPreviousData`
- `select`
- `enabled`
- Suspense queries (`useSuspenseQuery`)
- Query cancellation

Pages use `useQuery` + `isPending` / `isError` flags (not Suspense). Pending UI is plain text (`Loading...`). Error UI is inconsistent (`Loading...` vs `Error...`).

### 1.7 Cache strategies and invalidation

**Cache identity** is only the inline `queryKey` arrays listed above. There is no hierarchical factory (`['workspaces']`, `['workspaces', id]`, `['workspaces', id, 'scenarios']`).

**Invalidation:** none. Nothing writes through the cache. After a hypothetical create/update/delete, lists would stay stale until `staleTime` elapses and a default refetch runs, or until `gcTime` drops unused queries.

**Updates:** none. List → detail is a separate query (`getScenarios` already embeds endpoint ids, but `getEndpointsData` is always its own request).

**Persistence:** none. Refreshing the browser rebuilds the client singleton from hydration (or empty, then fetch).

### 1.8 Stale time and garbage collection

- **staleTime:** 60s globally. After hydration, data is fresh for one minute. Then `refetchOnWindowFocus` / `refetchOnMount` can fire.
- **gcTime:** default 5 minutes. Inactive queries (navigating from `/w` to a workspace) remain in the **browser** singleton until GC. Server clients are discarded at the end of the request.
- No per-query `staleTime` / `gcTime`. Workspaces, scenarios, and endpoint payloads share the same freshness window even though they change at different rates (and some are currently static UI).

### 1.9 Query key management

Keys are string tuples written next to each `useQuery` / `prefetchQuery`. Duplication is manual. Typos and param mistakes do not fail the type checker (see scenario layout `endpointId` vs `scenarioId`).

Path ids for **client** queries are parsed with `usePathname().split("/")[n]`, not `useParams()`. That is brittle:

| File | Index | Intended meaning | Actual for `/w/ws/sc/ep` |
| --- | --- | --- | --- |
| `app/w/[workspaceId]/page.tsx` | `[2]` | workspace id | `ws` (correct on this shape) |
| `app/w/[workspaceId]/[scenarioId]/page.tsx` | `[1]` | treated as workspace id for `getScenarios` | `"w"` (incorrect) |
| `app/w/[workspaceId]/[scenarioId]/[endpointId]/page.tsx` | `[4]` | endpoint id | `ep` (correct on this shape) |

If the route prefix ever changes, client keys silently diverge from server prefetch keys.

### 1.10 Prefetching and optimistic updates

Prefetch exists only in the four `app/w/**/layout.tsx` files via `prefetchQuery`. There is no:

- Link hover prefetch
- `router.prefetch` combined with query prefetch
- Prefetch of the next endpoint when listing scenarios
- Optimistic UI

`getScenarios` already loads first-endpoint ids for links (`scenario.endpoints[0].id` in the workspace page). That is Prisma include shape, not React Query cache seeding of `["endpoint", id]`.

### 1.11 Error handling and retries

- Query functions do not catch errors; Prisma/server-action failures become query errors.
- UI: `isError` branches; workspace list labels errors as `"Loading..."`.
- No `error` object rendering, no retry button (`refetch`).
- Default **3 retries** on the client for failed server actions (can amplify load on a failing Prisma call).
- Prefetch: failed `prefetchQuery` does not throw the layout; the client may still show pending then error.

### 1.12 Strengths

1. **App Router + hydration is in place** for the workspace area: layouts prefetch, pages hydrate, which is the supported v5 Next.js pattern.
2. **Global `staleTime: 60_000`** avoids the classic “SSR then instant client refetch” problem when keys match.
3. **Browser singleton** keeps cache across client navigations under `/w` (for example, returning to the workspace list within `gcTime` can reuse `["workspaces"]`).
4. **React `cache()` on the server** can share one `QueryClient` among nested layouts in a single request (when prefetch keys are correct).
5. **Server actions as `queryFn`** keep Prisma on the server; the client never imports `prisma`.
6. **Provider at the root** is simple and matches a single-app cache.

### 1.13 Potential inefficiencies and defects (observed)

1. **Hydration miss on the scenario segment** due to wrong `params` typing, unused `["endpoints"]` cache, and scenario page querying `["scenarios", "w"]`.
2. **Nested `dehydrate` of a shared client** can repeat parent cache in HTML (workspaces + scenarios serialized at inner boundaries).
3. **IDs from `pathname.split`** duplicate route params and desync keys.
4. **No mutations/invalidation** — not a runtime bug today (read-only UI), but lists cannot stay consistent once writes exist (top bar already has “New endpoint” / “Fork Scenario” links with no handlers).
5. **Duplicate `queryKey`/`queryFn` pairs** instead of `queryOptions`.
6. **Default refetch-on-focus** after 60s will re-run server actions (full `findMany` for workspaces/scenarios) even when the UI is static.
7. **`getWorkspaces` hardcoded owner** — cache key `["workspaces"]` cannot distinguish users; any future auth change would mix or wrongly share cache in the browser singleton.
8. **`console.log` in server layout and endpoint page** — noise, not cache-related except extra work on render.
9. **Sidebar/topbar** do not read the query cache; scenario/workspace navigation is hardcoded, so prefetched data is unused in chrome.
10. **`makeQueryClient` wrapped in `cache()` and used from the client** mixes RSC memoization with the browser singleton; TanStack’s documented pattern is a plain `makeQueryClient()` plus `isServer` / browser singleton, without `cache()` on the factory used by the client.
11. **Scenario page `redirect` during client render** depends on a mis-keyed query; users can hit loading/error instead of a server-side redirect.

---

## 2. Caching Improvement Opportunities

### 2.1 How caching can be improved in *this* app

React Query already holds a browser cache for hydrated queries. Gains come from:

1. Making **prefetch keys identical** to **client keys** (today several are not).
2. **Sharing one definition** (`queryOptions`) so they cannot drift.
3. **Not dehydrating the full shared cache at every nested layout**.
4. Tuning **freshness** so static mock-admin data is not refetched on every focus after 60s.
5. **Seeding detail caches** from list payloads where the list already contains nested ids (and later, fields).
6. Adding **invalidation** only when mutations exist.

Cache persistence (`persistQueryClient`) is **not** in the dependency tree. It would require a new package and a storage adapter. For a small Prisma-backed dashboard with 60s staleTime and layout prefetch, persistence is optional (see Low Priority).

### 2.2 Unnecessary API requests and redundant refetches

| Situation | Why it happens | Result |
| --- | --- | --- |
| Visit `/w/:workspaceId/:scenarioId` | Scenario layout prefetches `getEndpoints(undefined)`; page calls `getScenarios("w")` | Extra DB work + a useless cache entry; page does not use layout data |
| Nested layouts dehydrate a `cache()`-shared client | Each `HydrationBoundary` serializes whatever is already in that client | Duplicate dehydrated `workspaces` / `scenarios` in the RSC payload |
| `staleTime` 60s + default `refetchOnWindowFocus` | User tabs away >60s and returns | Repeat `getWorkspaces` / `getScenarios` / `getEndpointsData` server actions |
| Navigate workspace → scenario page | Scenario page does not reuse `["scenarios", workspaceId]` | New query instead of cache hit |
| Endpoint page after workspace list | List only stored endpoint **ids**, not `getEndpointsData` fields | Detail always needs its own prefetch/query (acceptable, but not seeded) |

When keys **do** match (workspace list, workspace page, endpoint page), the 60s staleTime **does** prevent an immediate post-hydration refetch. That path is already working.

### 2.3 `staleTime`, `gcTime`, invalidation, persistence

**staleTime (current: 60s global)**

This data is loaded from Prisma and, in the current UI, is not edited in-app. A longer default (e.g. 5–30 minutes) or per-query values would cut focus refetches. Endpoint **response body/headers** (`getEndpointsData`) might need a shorter staleTime than workspace names once editing exists.

**gcTime (current: default 5 minutes)**

The browser singleton already keeps `["workspaces"]` while the user is inside `/w/:id`. Five minutes is reasonable. Increasing `gcTime` on `["workspaces"]` / `["scenarios", id]` would help users who leave `/w` (public home) and return later without a full refetch—only if you also keep `staleTime` long enough or accept a background refetch.

**Invalidation**

There are no mutations. Do not add blanket `invalidateQueries()` on navigation. When “New endpoint” / “Fork Scenario” are implemented, invalidate or update:

- `["endpoints", scenarioId]` (once that query is actually used)
- `["scenarios", workspaceId]` (because of `endpoints: { select: { id: true } }`)
- `["endpoint", endpointId]` for the edited record

**Persistence**

Not applicable until `@tanstack/query-persist-client` (or equivalent v5 persist packages) is added. Prefetch-on-layout already covers first paint for `/w` routes.

### 2.4 Query key structure

**Current (flat, inconsistent nouns):**

```text
["workspaces"]
["scenarios", workspaceId]
["endpoints", scenarioId]    // intended, currently undefined
["endpoint", endpointId]     // singular vs plural
```

**Recommended (hierarchical, matches URL and DAL):**

```text
["workspaces"]                          // or ["workspaces", ownerId] once auth exists
["workspaces", workspaceId, "scenarios"]
["scenarios", scenarioId, "endpoints"]
["endpoints", endpointId]
```

Alternatively keep short keys but **never** mix `endpoint` / `endpoints` without a factory. Hierarchical keys allow:

```ts
queryClient.invalidateQueries({ queryKey: ["workspaces", workspaceId] });
```

to refresh all scenario/endpoint queries under a workspace.

Use `queryOptions` in a single module (e.g. `apps/web/lib/queries/workspace.ts`) so prefetch and `useQuery` cannot diverge.

---

## 3. React Query Optimization

Recommendations below are tied to files and behavior in `apps/web`, not generic TanStack checklists.

### 3.1 Fix prefetch ↔ `useQuery` identity (largest win)

Until keys and params match, React Query’s cache **does not apply** on the scenario route. Optimization of `staleTime` is irrelevant there.

### 3.2 Replace `pathname.split` with `useParams()`

Three client pages parse the URL by index. `useParams()` (or passing ids from a small server wrapper) keeps keys aligned with layout `params` and Next.js 16 async params.

### 3.3 Deduplicate query definitions with v5 `queryOptions`

v5.103 supports `queryOptions({ queryKey, queryFn, staleTime })`. Layouts should `prefetchQuery(options)` and pages `useQuery(options)`. This is the main structural fix for this codebase’s copy-paste keys.

### 3.4 Nested hydration payload

Four nested `HydrationBoundary`s + `cache()`-shared `QueryClient` means inner `dehydrate()` includes outer queries.

**Options compatible with the current tree:**

- **A.** Keep `cache()` sharing, but dehydrate **only at the leaf** (remove inner boundaries) and prefetch in layouts without wrapping each level — children still see the same request-scoped client if you dehydrate once at `app/w/layout.tsx` after all prefetches. Nested layouts in App Router cannot easily “wait” for children, so this often means prefetching only in the **deepest layout that knows the id**, or prefetching in **pages** (as async RSC) instead of every layout.
- **B.** Follow TanStack’s sample more closely: `makeQueryClient()` **without** `cache()`, so each layout’s client only contains that layout’s prefetch. Nested `HydrationBoundary` then merges smaller blobs. You lose cross-layout prefetch reuse on the server (usually unnecessary if each layout prefetches its own key).
- **C.** Hybrid: `cache()` for prefetch reuse on the server, but pass `dehydrate(queryClient, { shouldDehydrateQuery: (q) => q.queryKey[0] === "endpoint" })` (or similar) so each boundary only emits its own keys.

Option **B** or **C** fits the current “one prefetch per layout” architecture without a large redesign.

### 3.5 Re-renders and duplicate queries

- Each page is a client component whose `useQuery` result identity changes on fetch status. There is no `select`, so any field change re-renders the whole page (pages are small today).
- `QueryClientProvider` at root is fine; no extra providers.
- Scenario page and workspace page can both subscribe to scenarios **if keys are fixed**; that is **desirable** sharing, not a duplicate network call.
- `getQueryClient()` during `ReactQueryProvider` render does not create extra clients on the browser after the first call.

### 3.6 Data synchronization

- Sidebar/topbar do not subscribe to queries; they cannot go stale relative to pages, but they also cannot show live workspace/scenario names from cache.
- `getScenarios` include vs `getEndpoints` vs `getEndpointsData` are three shapes for related data. The cache cannot reuse `findMany` rows as `findFirst` detail without an explicit `setQueryData` mapper.
- Workspace page assumes `scenario.endpoints[0]` exists; empty endpoints throw at render (not a Query issue, but it affects the query’s usefulness).

### 3.7 Server actions as `queryFn`

This is valid in Query v5 + Next.js. Trade-off: every refetch is a server action with Prisma, not a cached GET. Combined with `retry: 3` and focus refetch, failures and idle tabs generate extra load. Consider `retry: 1` for this DAL.

### 3.8 `isPending` after hydration

When hydration works, `isPending` should be false if data is in the dehydrated state. The remaining `if (isPending) return <div>Loading...</div>` is still needed for cache misses (wrong keys, first client visit without RSC). After fixing keys, users should rarely see it on hard navigation into prefetched routes.

### 3.9 Devtools

Not installed. Adding `@tanstack/react-query-devtools` in development would make key mismatches (`["scenarios", "w"]` vs `["scenarios", uuid]`) obvious. No production impact if gated on `process.env.NODE_ENV`.

---

## 4. Actionable Recommendations

### R1 — Align scenario layout params and query keys with the route

**Current implementation**  
`app/w/[workspaceId]/[scenarioId]/layout.tsx` types `params` as `{ endpointId: string }`, prefetches `getEndpoints(endpointId)` under `["endpoints", endpointId]`.

**Problem**  
The dynamic segment is `scenarioId`. Prefetch id is `undefined`. No page reads this key.

**Improvement**  
Use `params: Promise<{ workspaceId: string; scenarioId: string }>` (parent ids are available on nested layouts in the App Router). Prefetch `getEndpoints(scenarioId)` with `queryKey: ["endpoints", scenarioId]`. Consume the same options in a client page or sidebar when you list endpoints.

**Example**

```ts
import { queryOptions } from "@tanstack/react-query";
import { getEndpoints } from "@/lib/actions/dal";

export const endpointsQuery = (scenarioId: string) =>
  queryOptions({
    queryKey: ["endpoints", scenarioId] as const,
    queryFn: () => getEndpoints(scenarioId),
  });
```

**Benefits**  
Hydration hits; one DB read per scenario navigation instead of a wasted prefetch plus a wrong client query.  
**Trade-offs**  
None for correctness. You must add a consumer or remove the prefetch if the UI still only redirects.

---

### R2 — Fix scenario page key, id source, and redirect strategy

**Current implementation**  
`app/w/[workspaceId]/[scenarioId]/page.tsx` uses `path.split("/")[1]` (`"w"`), `getScenarios`, `["scenarios", uuid]`, then client `redirect()`.

**Problem**  
Cache miss vs workspace layout; `getScenarios("w")` is the wrong query; redirect belongs on the server if the goal is “open first endpoint”.

**Improvement**  
Either:

- **Server page:** `redirect(\`/w/${workspaceId}/${scenarioId}/${firstEndpointId}\`)` using `getScenarios` or `getEndpoints` directly (no React Query on this hop), or
- **Client:** `useParams()`, `useQuery(scenariosQuery(workspaceId))` to reuse the workspace layout cache, then `router.replace(...)`.

**Benefits**  
Removes a guaranteed extra request; uses existing `["scenarios", workspaceId]` cache.  
**Trade-offs**  
A server `redirect` skips client cache but is cheaper (one RSC + 302) than a broken client query. Prefer server redirect for this page’s current behavior.

---

### R3 — Centralize keys with `queryOptions`

**Current implementation**  
The same `queryKey` / `queryFn` pairs are copied in:

- `app/w/layout.tsx` + `app/w/page.tsx`
- `app/w/[workspaceId]/layout.tsx` + `app/w/[workspaceId]/page.tsx`
- endpoint layout + `.../page.tsx`

**Problem**  
Drift (already happened on the scenario segment). No single staleTime per resource.

**Improvement**  
Add e.g. `apps/web/lib/queries/*.ts` (or `apps/web/provider/queries.ts`) exporting `workspacesQuery`, `scenariosQuery(id)`, `endpointsQuery(id)`, `endpointQuery(id)`.

Layouts:

```ts
await queryClient.prefetchQuery(scenariosQuery(workspaceId));
```

Pages:

```ts
const { data } = useQuery(scenariosQuery(workspaceId));
```

**Benefits**  
Type-safe keys; prefetch/`useQuery` stay in lockstep. Compatible with v5.103.  
**Trade-offs**  
Small new module; one-time refactor.

---

### R4 — Read ids with `useParams()`, not `pathname.split`

**Current implementation**  
`app/w/[workspaceId]/page.tsx` (`[2]`), scenario page (`[1]`), endpoint page (`[4]`).

**Problem**  
Fragile; scenario page is already wrong. Query keys depend on string indexes.

**Improvement**

```ts
const { workspaceId } = useParams<{ workspaceId: string }>();
```

Use `enabled: Boolean(workspaceId)` so queries do not run with `undefined`.

**Benefits**  
Stable keys; fewer hydration misses.  
**Trade-offs**  
None.

---

### R5 — Stop dehydrating the entire shared cache at every layout

**Current implementation**  
`getQueryClient()` → `cache()`-memoized server client; each of `app/w/layout.tsx`, `app/w/[workspaceId]/layout.tsx`, scenario layout, endpoint layout calls `dehydrate(queryClient)`.

**Problem**  
Inner HTML may include parent queries again (`workspaces` inside workspace layout snapshot, etc.).

**Improvement**  
Pick one:

1. Remove `cache()` from `makeQueryClient` so each layout dehydrates only its own prefetch (TanStack Next.js app-router sample).
2. Keep `cache()`, add `shouldDehydrateQuery` so each boundary emits only its key prefix.

**Example (filter)**

```ts
<HydrationBoundary
  state={dehydrate(queryClient, {
    shouldDehydrateQuery: (query) => query.queryKey[0] === "scenarios",
  })}
>
```

**Benefits**  
Smaller RSC payload, faster hydration.  
**Trade-offs**  
(1) No server-side reuse of sibling prefetches (usually unused). (2) You must keep the filter in sync with that layout’s prefetch.

---

### R6 — Split `makeQueryClient` from React `cache()` for the browser bundle

**Current implementation**  
`makeQueryClient = cache(() => new QueryClient(...))` is used for both `isServer` and `browerQueryClient`.

**Problem**  
`cache()` is intended for Server Components. The client path already has a singleton; wrapping the factory in `cache()` is confusing and not the documented TanStack pattern.

**Improvement**

```ts
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });
}

export function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
```

If you still want one client per RSC request **and** nested layouts to share it, wrap **only the server branch**:

```ts
const getServerQueryClient = cache(makeQueryClient);
// isServer ? getServerQueryClient() : browser singleton
```

**Benefits**  
Clearer lifecycle; matches v5 App Router docs.  
**Trade-offs**  
If you drop `cache()` entirely, nested layouts get separate server clients (see R5).

Also rename `browerQueryClient` → `browserQueryClient` (typo only).

---

### R7 — Tune `staleTime`, `gcTime`, `retry`, and focus refetch

**Current implementation**  
Only `staleTime: 60 * 1000` in `get-query-client.ts`. v5 defaults: `gcTime` 5m, `retry` 3, `refetchOnWindowFocus` true.

**Problem**  
After one minute, focusing the tab refetches all observed queries via server actions. Prisma `findMany` for workspaces/scenarios is not user-edited yet. Three retries multiply failures.

**Improvement** (illustrative; adjust per resource in `queryOptions`):

```ts
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false, // or "always" only on endpoint detail once editing exists
    },
  },
});
```

Or keep a 60s default and set `staleTime: Infinity` (or 10+ minutes) on `workspacesQuery` / `scenariosQuery` until mutations exist; keep endpoint detail shorter.

**Benefits**  
Fewer server actions, less Prisma load, less loading flicker.  
**Trade-offs**  
Stale chrome if data is changed outside this tab (another user, DB seed). Invalidation (R9) becomes mandatory when writes land.

---

### R8 — Correct error UI and avoid querying without ids

**Current implementation**  
`app/w/page.tsx` renders `"Loading..."` for `isError`. Other pages render `"Error..."`. No `refetch`. Scenario/workspace pages call `getScenarios(uuid)` even if `uuid` is wrong.

**Problem**  
Failed fetches look like loading on `/w`. Bad ids still hit the server.

**Improvement**  
Show a distinct error + retry; `enabled: Boolean(id)`. Do not use `isPending` as the error state.

**Benefits**  
Debuggable UX; fewer junk requests.  
**Trade-offs**  
None.

---

### R9 — When mutations exist: invalidate or update cache (not now)

**Current implementation**  
No `useMutation`. Top bar labels imply future writes (`New endpoint`, `Fork Scenario`).

**Problem**  
After writes, `["scenarios", workspaceId]` would still hold old `endpoints[0].id` for `staleTime`.

**Improvement**  
`useMutation` with `queryClient.invalidateQueries({ queryKey: scenariosQuery(workspaceId).queryKey })` or `setQueryData` for the new endpoint. Optimistic updates only if the UI must show the row before the server returns.

**Benefits**  
Consistent lists.  
**Trade-offs**  
Optimistic updates need rollback; invalidation is simpler and enough for this DAL.

---

### R10 — Optional: seed endpoint cache from lists / prefetch on navigation

**Current implementation**  
`getScenarios` only selects endpoint `id`. `getEndpointsData` is a separate query. Workspace `Link` goes to `/w/${uuid}/${scenario.id}/${scenario.endpoints[0].id}` without prefetching detail.

**Problem**  
Detail always waits on endpoint layout prefetch (OK on full navigation) or a client fetch on client transitions.

**Improvement**  
On the workspace page, `queryClient.prefetchQuery(endpointQuery(firstId))` in `onMouseEnter` / `onClick`, or include more fields in `getScenarios` and `setQueryData` for `["endpoint", id]`.

**Benefits**  
Faster endpoint view on client navigations.  
**Trade-offs**  
Heavier scenario queries if you over-include `responseBody`. Prefer hover prefetch of `getEndpointsData` over bloating the list query.

---

### R11 — Subscribe layout chrome to the same queries (when building the real sidebar)

**Current implementation**  
`components/layout/sidebar/sidebar.tsx` is static. `topbar.tsx` hardcodes links. Scenarios are fetched in the workspace layout **and** the workspace page, but chrome ignores the cache.

**Problem**  
When the sidebar lists scenarios, a second `useQuery(scenariosQuery(id))` is the **right** approach (shared cache). Fetching again with a new key would duplicate network.

**Improvement**  
Reuse `scenariosQuery(workspaceId)` in `Sidebar`. Do not add a parallel `fetch` or a different key.

**Benefits**  
One request, consistent names.  
**Trade-offs**  
Sidebar must be a client component (or receive dehydrated data as props).

---

### R12 — Devtools in development

**Current implementation**  
No Devtools package.

**Problem**  
Key mismatches are hard to see.

**Improvement**  
Add `@tanstack/react-query-devtools` and render `<ReactQueryDevtools />` inside `QueryProvider` when `process.env.NODE_ENV === "development"`.

**Benefits**  
Inspect keys, stale/fresh, dehydrated vs fetch.  
**Trade-offs**  
Dev-only bundle; must not ship to production if you care about bundle size (standard gating).

---

### R13 — Cache persistence (optional, not in repo)

**Current implementation**  
No persist plugin.

**Problem**  
Full reload depends on SSR prefetch. That is already the primary path.

**Improvement**  
Skip until offline/reload-without-server is a product requirement. If added, persist only `workspaces` / `scenarios` with a versioned buster when DAL shapes change.

**Benefits**  
Instant paint after reload even if RSC is slow.  
**Trade-offs**  
New dependencies, stale localStorage vs DB, privacy of cached response bodies.

---

### R14 — `getWorkspaces` owner in the query key

**Current implementation**  
`getWorkspaces` filters `ownerId: "33923283-a008-4e53-8b97-b11be654f1d9"`. Key is `["workspaces"]`.

**Problem**  
The browser singleton would mix users if auth is added later without changing the key.

**Improvement**  
`queryKey: ["workspaces", ownerId]` (or session user id) when owner is real. Until then, document that the cache is global per browser tab, not per user.

**Benefits**  
Correct multi-user cache.  
**Trade-offs**  
Need a real session source; do not put secrets in keys.

---

### R15 — Remove debug `console.log` from the query path

**Current implementation**  
`console.log("id", workspaceId)` in `app/w/[workspaceId]/layout.tsx`; `console.log(data)` in endpoint page.

**Problem**  
Not a cache bug; clutters logs and can serialize large `responseBody` on the client.

**Improvement**  
Remove or guard with Devtools.

**Benefits**  
Less work on render; smaller noise.  
**Trade-offs**  
None.

---

## 5. Implementation Roadmap

### High priority (correctness + wasted requests)

These change behavior users already hit on `/w/...` routes.

1. **R1** — Fix `[scenarioId]` layout `params` and `["endpoints", scenarioId]` prefetch (or remove prefetch until a consumer exists).
2. **R2** — Fix or replace `app/w/[workspaceId]/[scenarioId]/page.tsx` (wrong split index, wrong query vs layout, client redirect).
3. **R4** — `useParams()` + `enabled` on remaining client pages (workspace + endpoint).
4. **R3** — Introduce `queryOptions` and switch existing prefetch/`useQuery` pairs (`workspaces`, `scenarios`, `endpoint`) so R1–R2 cannot regress.

**Step-by-step**

1. Add `apps/web/lib/queries/` with four `queryOptions` helpers wrapping the DAL functions.
2. Point `app/w/layout.tsx` and `app/w/page.tsx` at `workspacesQuery`.
3. Point `app/w/[workspaceId]/layout.tsx` and `page.tsx` at `scenariosQuery(workspaceId)` using `params` / `useParams`.
4. Fix scenario layout types; either prefetch `endpointsQuery(scenarioId)` and use it, or delete that prefetch.
5. Change scenario `page.tsx` to a server `redirect` using DAL, or a client query with `workspaceId` from `useParams`.
6. Point endpoint layout/page at `endpointQuery(endpointId)` and `useParams().endpointId`.
7. Manually verify: navigate `/w` → workspace → scenario → endpoint; Network tab should not refetch immediately after hydration; React Query Devtools (if R12 is done in the same pass) should show matching keys.

### Medium priority (payload, refetch volume, client factory)

8. **R6** — Documented `makeQueryClient` + server-only `cache()`.
9. **R5** — Shrink dehydrated state (per-layout client or `shouldDehydrateQuery`).
10. **R7** — Raise `staleTime` / reduce `retry` / disable focus refetch for list queries.
11. **R8** — Error UI and `enabled`.
12. **R12** — Devtools.
13. **R15** — Remove query-path `console.log`.

**Step-by-step**

1. Adjust `get-query-client.ts` as in R6; confirm `/w` still hydrates (no extra fetch in the first 60s, or new staleTime).
2. Apply dehydration filtering or drop `cache()` sharing; compare RSC payload size on a workspace+endpoint URL.
3. Set list-query `staleTime` in `queryOptions` (not only global) so endpoint editing can stay fresher later.
4. Add Devtools; confirm no duplicate `workspaces` queries after nested layout renders.

### Low priority (future product)

14. **R11** — Sidebar/topbar `useQuery` with the same options as pages.
15. **R10** — Hover prefetch / `setQueryData` for endpoint detail.
16. **R9** — Mutations + invalidation when create/fork/share are implemented.
17. **R14** — Owner id in `workspaces` key with auth.
18. **R13** — Persist client only if reload-without-server matters.

**Step-by-step (when building writes)**

1. Implement `useMutation` next to the DAL write (new server action).
2. `onSuccess`: `invalidateQueries` for `scenariosQuery(workspaceId)` and `endpointsQuery(scenarioId)`.
3. Optionally `setQueryData` on `endpointQuery(id)` for the editor.
4. Only then consider optimistic updates.

---

## Appendix: File map

| Path | Role |
| --- | --- |
| `apps/web/package.json` | `@tanstack/react-query` `^5.103.2` |
| `apps/web/provider/get-query-client.ts` | `QueryClient` defaults, `cache()`, browser singleton |
| `apps/web/provider/QueryProvider.tsx` | `QueryClientProvider` |
| `apps/web/app/layout.tsx` | Mounts provider |
| `apps/web/lib/actions/dal.ts` | Server actions used as `queryFn` |
| `apps/web/app/w/layout.tsx` | Prefetch `["workspaces"]` |
| `apps/web/app/w/page.tsx` | `useQuery` workspaces |
| `apps/web/app/w/[workspaceId]/layout.tsx` | Prefetch `["scenarios", workspaceId]` |
| `apps/web/app/w/[workspaceId]/page.tsx` | `useQuery` scenarios |
| `apps/web/app/w/[workspaceId]/[scenarioId]/layout.tsx` | Prefetch `["endpoints", endpointId]` (broken params) |
| `apps/web/app/w/[workspaceId]/[scenarioId]/page.tsx` | `useQuery` scenarios with wrong path index |
| `apps/web/app/w/[workspaceId]/[scenarioId]/[endpointId]/layout.tsx` | Prefetch `["endpoint", endpointId]` |
| `apps/web/app/w/[workspaceId]/[scenarioId]/[endpointId]/page.tsx` | `useQuery` endpoint detail |

---

## What this document does not assume

- No REST/GraphQL client, axios, or SWR in `apps/web`.
- No `HydrationBoundary` outside `app/w/**`.
- No Query persist, infinite query, or mutation code to “improve” — those would be new.
- Recommendations use TanStack Query **v5** APIs (`gcTime` not `cacheTime`, `isPending` not v4 `isLoading` as the primary idle flag, `queryOptions`).
