# Tramus

 ## @apps/web

 The apps/web/ directory contains the frontend of an API‑testing platform (similar to
 Postman/Hoppscotch). It is a Next.js 16 application built with React 19, TypeScript, TailwindCSS 4,
 and shadcn/ui primitives. The app lets users create workspaces → scenarios (collections) →
 endpoints, configure HTTP requests (method, URL, headers, authentication, body), send them, view
 responses, and persist collections via a server‑side data layer.

 ────────────────────────────────────────────────────────────────────────────────

 ### Architecture (excluding the app/api testing folder)

 ┌─────────────────┬────────────────────────────┬───────────────────────────────────────────────────┐
 │ Layer           │ Responsibility             │ Key Files / Technologies                          │
 ├─────────────────┼────────────────────────────┼───────────────────────────────────────────────────┤
 │ Presentation /  │ Page routing, layout,      │ • app/ (Next.js App Router – workspaces under     │
 │ UI              │ reusable components,       │ /w/[workspaceId]/…)<br>• components/layout/       │
 │                 │ theming                    │ (header, footer, mode‑toggle, editor‑shell, bar,  │
 │                 │                            │ etc.)<br>• components/ui/ (shadcn/ui              │
 │                 │                            │ primitives)<br>• provider/theme-provider.tsx      │
 │                 │                            │ (next‑themes)                                     │
 ├─────────────────┼────────────────────────────┼───────────────────────────────────────────────────┤
 │ State           │ • Editor UI state (tabs,   │ • Zustand store: lib/store/editor.store.ts (immer │
 │ Management      │ drafts, baseline, save     │ middleware, tab/draft lifecycle)<br>• React Query │
 │                 │ status)<br>• Server state  │ client: lib/query/get-query-client.ts +           │
 │                 │ (data fetching /           │ provider/QueryProvider.tsx<br>• Custom hooks:     │
 │                 │ mutations)                 │ hooks/use-add-draft-tab.ts                        │
 ├─────────────────┼────────────────────────────┼───────────────────────────────────────────────────┤
 │ Data Access     │ Server‑side CRUD           │ • lib/actions/dal.ts – "use server" functions     │
 │ Layer           │ operations on workspaces,  │ (getWorkspaces, createWorkspace, etc.)<br>• Uses  │
 │                 │ scenarios, endpoints       │ @tramus/db workspace package (Prisma client)      │
 │                 │ (Prisma)                   │                                                   │
 ├─────────────────┼────────────────────────────┼───────────────────────────────────────────────────┤
 │ Request         │ Sends HTTP requests,       │ Handled inside editor components (e.g.,           │
 │ Execution       │ updates draft status with  │ request-page.tsx, body-editor.tsx) using the      │
 │                 │ response data              │ browser fetch API; response is stored in the      │
 │                 │                            │ Zustand draft entry.                              │
 ├─────────────────┼────────────────────────────┼───────────────────────────────────────────────────┤
 │ API Proxy       │ Excluded per instruction – │ app/api/proxy/route.ts (present but not part of   │
 │ (testing only)  │ a simple Next.js route     │ core architecture).                               │
 │                 │ used for local request     │                                                   │
 │                 │ proxying/mocking during    │                                                   │
 │                 │ development.               │                                                   │
 ├─────────────────┼────────────────────────────┼───────────────────────────────────────────────────┤
 │ Styling & Theme │ Utility‑first CSS,         │ • TailwindCSS 4 (tailwind.config.ts implicitly    │
 │                 │ dark/light system theme    │ via @tailwindcss/postcss)<br>• next-thems         │
 │                 │                            │ provider<br>• @base-ui/react and local            │
 │                 │                            │ components/ui for shadcn/ui primitives            │
 ├─────────────────┼────────────────────────────┼───────────────────────────────────────────────────┤
 │ Editing         │ Rich JSON editing, syntax  │ • @uiw/react-codemirror + @codemirror/*           │
 │ Experience      │ highlighting, linting      │ packages<br>• Used in body-editor.tsx for JSON    │
 │                 │                            │ body view                                         │
 ├─────────────────┼────────────────────────────┼───────────────────────────────────────────────────┤
 │ Additional UX   │ Resizable panels, toast    │ • react-resizable-panels<br>• sonner (toast)<br>• │
 │                 │ notifications, request     │ immer (via Zustand) for baseline/draft diff       │
 │                 │ history/comparison         │                                                   │
 ├─────────────────┼────────────────────────────┼───────────────────────────────────────────────────┤
 │ Configuration & │ TypeScript, linting, build │ • tsconfig.json<br>• next.config.ts<br>•          │
 │ Tooling         │ scripts, package manager   │ package.json (scripts: dev, build, start,         │
 │                 │                            │ lint)<br>• Package manager: Bun                   │
 └─────────────────┴────────────────────────────┴───────────────────────────────────────────────────┘

 ────────────────────────────────────────────────────────────────────────────────

 ### Data Flow Overview

 1. UI Interaction – User clicks in the workspace/scenario/endpoint tree (built from data fetched via
    React Query → server actions).
 2. State Update – Zustand store creates/updates a tab draft (ensureDraft, updateDraft). UI
    components (URL bar, auth editor, body editor, etc.) read/write the draft via selectors
    (selectDraft, selectIsDirty).
 3. Request Send – When the user hits “Send”, the editor components serialize the draft, call fetch
    (or similar) to the target URL, receive the response, and update the draft’s status/error via the
    store.
 4. Persistence – Actions like “Save” or “Create Workspace” invoke server actions
    (lib/actions/dal.ts) that perform Prisma mutations; results are re‑fetched via React Query to
    keep the UI in sync.
 5. Theme & Layout – Theme provider wraps the app; layout components provide consistent
    header/footer/dark‑mode toggle across all pages.

 ────────────────────────────────────────────────────────────────────────────────

 ### Exclusions

 - The apps/web/app/api directory (specifically proxy/route.ts) is omitted from the architecture
   description as it serves only for local testing/mocking of requests and is not part of the
   production API‑testing platform’s core design.

 ────────────────────────────────────────────────────────────────────────────────

 Result: A modular, Next.js‑based web client that cleanly separates UI, state, data access, and
 request execution, delivering a Postman‑like experience for composing, sending, and managing HTTP
 requests while persisting collections via a Prisma‑backed server layer.