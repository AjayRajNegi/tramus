# Tramus

 ## @apps/web

 The apps/web/ directory contains the frontend of an API‑testing platform (similar to
 Postman/Hoppscotch). It is a Next.js 16 application built with React 19, TypeScript, TailwindCSS 4,
 and shadcn/ui primitives. The app lets users create workspaces → scenarios (collections) →
 endpoints, configure HTTP requests (method, URL, headers, authentication, body), send them, view
 responses, and persist collections via a server‑side data layer.

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


 ### Exclusions

 - The apps/web/app/api directory (specifically proxy/route.ts) is omitted from the architecture
   description as it serves only for local testing/mocking of requests and is not part of the
   production API‑testing platform’s core design.

 Result: A modular, Next.js‑based web client that cleanly separates UI, state, data access, and
 request execution, delivering a Postman‑like experience for composing, sending, and managing HTTP
 requests while persisting collections via a Prisma‑backed server layer.