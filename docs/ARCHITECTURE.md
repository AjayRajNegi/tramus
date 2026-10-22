# Tramus: Architecture

*Version 1.0 · Based on codebase analysis*

---

## 1. High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER'S BROWSER                                  │
│  ┌──────────────────────────────────┐   ┌────────────────────────────────┐  │
│  │       TRAMUS WEB APP             │   │   TRAMUS INTERCEPTOR EXTENSION │  │
│  │  (Next.js, React, motion)        │   │   (WXT, Manifest V3)           │  │
│  │                                  │   │                                 │  │
│  │  ┌────────────────────────────┐  │   │  ┌──────────────────────────┐  │  │
│  │  │ Editor UI                  │  │   │  │ Content Script           │  │  │
│  │  │ - Endpoint builder         │  │   │  │ - Injected on app origin │  │  │
│  │  │ - Timeline/Waterfall       │  │   │  │ - postMessage bridge     │  │  │
│  │  │ - Request log              │  │   │  │ - Origin validation      │  │  │
│  │  │ - Scenario comparison      │  │   │  └───────────┬──────────────┘  │  │
│  │  └──────────────┬─────────────┘  │   │              │               │  │
│  │                 │                │   │              ▼               │  │
│  │  ┌──────────────▼─────────────┐  │   │  ┌──────────────────────────┐  │  │
│  │  │ Extension Client           │  │   │  │ Background Worker        │  │  │
│  │  │ - sendViaExtension()       │◄──┼───┼─►│ - execute() → fetch()    │  │  │
│  │  │ - Pending map (id→resolve) │  │   │  │ - declarativeNetRequest  │  │  │
│  │  │ - isExtensionInstalled()   │  │   │  │ - webRequest observer    │  │  │
│  │  └────────────────────────────┘  │   │  │ - Permission checks      │  │  │
│  │                                  │   │  └──────────────────────────┘  │  │
│  └──────────────────────────────────┘   └────────────────────────────────┘  │
│           │                                    │                             │
│           │ HTTPS                                │ fetch()                   │
│           ▼                                    ▼                             │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                        TRAMUS BACKEND (Node.js)                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │ Next.js API │  │ Mock Server │  │ Workspace   │  │ Snapshot    │   │  │
│  │  │ Routes      │  │ (per scenario)       │ Service   │  │ Service     │   │  │
│  │  │ - Workspaces│  │ - Route match       │ - CRUD    │  │ - S3 upload │   │  │
│  │  │ - Scenarios │  │ - Rules eval        │ - Fork    │  │ - Signed    │   │  │
│  │  │ - Endpoints │  │ - Latency/fault     │ - Rewind  │  │   URLs      │   │  │
│  │  │ - Snapshots │  │ - Event logging     │ - Replay  │  │ - Expiry    │   │  │
│  │  │ - Proxy     │  │                     │           │  │             │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                          │
│                    ┌───────────────┼───────────────┐                          │
│                    ▼               ▼               ▼                          │
│             ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                 │
│             │  PostgreSQL │ │   Redis     │ │   AWS S3    │                 │
│             │  (Prisma)   │ │ (sessions,  │ │ (snapshots, │                 │
│             │             │ │  rate limit)│ │  large body)│                 │
│             └─────────────┘ └─────────────┘ └─────────────┘                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Architecture

### 2.1 Web App (`apps/web`)

**Framework:** Next.js 16 (App Router) + React 19 + TypeScript

**Key Directories:**
```
apps/web/
├── app/
│   ├── (public)/           # Landing, auth pages
│   ├── w/                  # Workspace routes (protected)
│   │   ├── [workspaceId]/
│   │   │   ├── editor/     # Endpoint editor page
│   │   │   ├── [scenarioId]/
│   │   │   │   ├── [endpointId]/  # Endpoint detail
│   │   │   │   └── page.tsx       # Scenario overview
│   │   │   └── layout.tsx         # Workspace shell (sidebar + topbar)
│   │   └── layout.tsx             # Dashboard layout
│   └── api/                # API routes
│       ├── proxy/          # Fallback proxy for non-extension requests
│       └── ...
├── components/
│   ├── layout/
│   │   ├── editor-shell/   # Editor UI (UrlBar, RequestPane, tabs)
│   │   ├── bar/            # TopBar, AppSidebar, ExtensionStatus
│   │   └── ...
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── extension/          # Extension communication
│   │   ├── client.ts       # sendViaExtension(), pending map
│   │   └── index.ts        # isExtensionInstalled()
│   ├── request/
│   │   └── send-request.ts # sendRequest(), toTramusRequest()
│   ├── store/
│   │   └── editor.store.ts # Zustand store (drafts, tabs, status)
│   ├── actions/
│   │   └── dal.ts          # Data access layer (server actions)
│   └── ...
└── hooks/                  # Custom React hooks
```

**State Management:**
- **Zustand** (with Immer middleware) for editor drafts, tabs, active state
- **TanStack Query** for server data (workspaces, scenarios, endpoints)
- **Local component state** for UI interactions (modals, dropdowns)

**Extension Communication:**
```
Web App                          Content Script                    Background
    │                                │                                │
    ├── postMessage(WebRequest) ────►│                                │
    │                                ├── runtime.sendMessage() ─────►│
    │                                │                                ├── fetch()
    │                                │                                │
    │                                ◄──── runtime.sendMessage() ────┤
    │◄──── postMessage(ExtResponse) ──┤                                │
    │                                │                                │
```

### 2.2 Browser Extension (`apps/extension`)

**Framework:** WXT (Vite-based, TypeScript)

**Entry Points:**
```
apps/extension/
├── entrypoints/
│   ├── background.ts       # Service worker (MV3)
│   ├── content.ts          # Content script (injected on app origins)
│   └── popup/
│       ├── main.ts         # Popup logic
│       ├── index.html      # Popup HTML
│       └── style.css       # Popup styles
├── utils/
│   ├── execute.ts          # fetch() execution + body decoding
│   └── app-origin.ts       # Allowed origins + validation
├── wxt.config.ts           # WXT config (manifest, aliases)
└── package.json
```

**Background Worker Responsibilities:**
- `execute(request)` → `fetch()` with `credentials: 'omit'`, `cache: 'no-store'`
- `declarativeNetRequest` for forbidden header overrides (Origin, Referer, Cookie, User-Agent)
- `webRequest` observer for Set-Cookie, redirect chain, timing (T-015)
- Permission checks (`chrome.permissions.contains`) per host (T-012)
- Streaming via `chrome.runtime.connect` ports (T-014)

**Content Script Responsibilities:**
- Injected only on allowed origins (`APP_MATCH_PATTERNS`)
- Validates `sender.origin` + `sender.frameId === 0`
- Relays `WebRequest` ↔ `BackgroundRequest` via `postMessage` + `runtime.sendMessage`
- Auto-sends pong on load for detection

**Popup Responsibilities:**
- Connection status + version
- Pending hosts (from failed permission checks) → Grant button
- Granted hosts → Revoke button
- Calls `chrome.permissions.request()` on grant (requires user gesture)

### 2.3 Shared Protocol (`packages/protocol`)

**Pure TypeScript types** consumed by both web and extension.

```
packages/protocol/
├── index.ts    # All types + type guards
└── package.json
```

**Key Types:**
```typescript
// Request/Response
TramusRequest { method, url, headers: [string,string][], body? }
TramusResponse { status, statusText, headers, body, sizeBytes, timeMs }
TramusResult = { ok: true, response } | { ok: false, error: TramusError }

// Bridge messages
WebToExt = WebPing | WebRequest
ExtToWeb = ExtPong | ExtResponse

WebRequest { source: "tramus-web", type: "request", id, request }
ExtResponse { source: "tramus-ext", type: "response", id, result }

// Background messages
BackgroundRequest { type: "request", request }
BackgroundResponse { type: "response", result }

// Error codes (extensible)
TramusError = { code: "NETWORK" | "TIMEOUT" | "INVALID_REQUEST" | "EXTENSION_ERROR" | "ABORTED" | "HOST_NOT_ALLOWED", message }
```

**Design Principles:**
- Additive only — never remove/change fields, only add
- Version in pong messages for compatibility
- Type guards (`isWebToExt`, `isExtToWeb`, etc.) for runtime validation
- No runtime dependencies, only TypeScript types

### 2.4 Backend (`apps/server`)

**Framework:** Node.js (likely Hono or similar, based on `apps/server/index.ts`)

**Responsibilities:**
- Workspace/scenario/endpoint CRUD
- Mock server per scenario (route matching, rules evaluation, latency/fault injection)
- Event logging (append-only)
- Snapshot creation + S3 upload
- Share token management (hash storage, revocation, expiry)
- OpenAPI export generation
- Rate limiting

**Database:** PostgreSQL via Prisma (see DATABASE_SCHEMA.md)

---

## 3. Data Flow: Request Execution

### 3.1 With Extension (Local/Private Targets)

```
1. User clicks "Send" in editor
2. UrlBar.send() → toTramusRequest(draft) → TramusRequest
3. sendRequest(request):
   a. isExtensionInstalled(500ms) → true
   b. sendViaExtension(request):
      - Generate UUID id
      - Store resolver in pending Map
      - window.postMessage({ source: "tramus-web", type: "request", id, request })
4. Content script receives, validates origin, forwards to background
5. Background.execute(request):
   - Check chrome.permissions for target host
   - If missing: return HOST_NOT_ALLOWED, record pending host
   - Apply declarativeNetRequest for forbidden headers
   - fetch(url, { method, headers, body, credentials: 'omit', cache: 'no-store' })
   - Read body incrementally (20MB cap)
   - Return TramusResult
6. Background → Content script → postMessage(ExtResponse)
7. Web client resolves pending[id] with result
8. UrlBar.setStatus(activeId, "idle" | "error", response)
9. Draft updated with response data (status, headers, body, timing)
```

### 3.2 Without Extension (Public Targets / Fallback)

```
1. sendRequest(request):
   a. isExtensionInstalled(500ms) → false
   b. Direct fetch() from web app (subject to CORS)
   c. Same response processing
```

### 3.3 Proxy Fallback (T-007)

```
If extension not installed AND target is localhost/private:
  - POST TramusRequest to /api/proxy
  - Server executes fetch server-side
  - Returns TramusResponse
  - Install banner shown
```

---

## 4. Security Architecture

### 4.1 Extension Permissions Model

| Permission | Purpose | Scope |
|------------|---------|-------|
| `declarativeNetRequest` | Forbidden header overrides (session rules) | All hosts (session only) |
| `storage` | Pending/granted hosts, settings | Extension only |
| `webRequest` + `extraHeaders` | Observe Set-Cookie, redirects, timing | All hosts |
| `optional_host_permissions: ["<all_urls>"]` | Actual fetch() to target hosts | Granted per-host by user |

**Least Privilege Flow:**
1. Background checks `chrome.permissions.contains({ origins: ["<scheme>://<host>/*"] })`
2. If missing → `HOST_NOT_ALLOWED`, store pending host in `chrome.storage.local`
3. Web app shows "Open extension and allow `<host>`"
4. User clicks Grant in popup → `chrome.permissions.request()` (user gesture)
5. On success → retry request automatically
6. User can Revoke in popup → `chrome.permissions.remove()`

### 4.2 Origin Validation

- Content script `matches: APP_MATCH_PATTERNS` (build-time env var)
- Background validates `sender.url` origin against allowlist + `sender.frameId === 0`
- Development: `http://localhost:3000`
- Staging: `https://staging.tramus.dev`
- Production: `https://app.tramus.dev` only

### 4.3 Content Isolation

- Mock responses served from **different registrable domain** than app
- Response headers: `X-Content-Type-Options: nosniff`, `Content-Security-Policy: sandbox`, `Cache-Control: no-store`
- Web app renders responses as text / sandboxed iframe — never `dangerouslySetInnerHTML`

### 4.4 Secret Handling

| Secret | Source | Storage | Comparison |
|--------|--------|---------|------------|
| Share tokens | CSPRNG 256-bit | Hash (bcrypt/argon2) | Constant-time |
| Owner tokens | CSPRNG 256-bit | Hash | Constant-time |
| Mock URL keys | CSPRNG 96+ bit | Hash | Constant-time |
| Session IDs | CSPRNG | Hash | Constant-time |

- Never in logs, error messages, or Referer headers
- `Referrer-Policy: no-referrer` on share pages

---

## 5. Timeline & Scenario Branching Architecture

### 5.1 Event Model

```
Event = ConfigurationChange | RequestExecution

ConfigurationChange {
  id, timestamp, scenarioId, type: "endpoint_created" | "endpoint_updated" | "endpoint_deleted" | "rule_added" | ...
  payload: EndpointDefinition | RuleSet | ...
}

RequestExecution {
  id, timestamp, scenarioId, type: "request"
  request: TramusRequest
  response: TramusResponse
  configSnapshot: EndpointDefinition  // Exact config at execution time
  latencyApplied, faultApplied, seed
}
```

### 5.2 Fork Implementation (Fast, No Duplication)

```
Parent Scenario (main)          Forked Scenario (payment-failure)
┌─────────────────────────┐      ┌─────────────────────────┐
│ Event 1: config         │      │ Event 1: config         │  (shared reference)
│ Event 2: request A      │      │ Event 2: request A      │  (shared reference)
│ Event 3: request B      │      │ Event 3: request B      │  (shared reference)
│ Event 4: request C      │      │ Event 4: request C      │  (shared reference)
└─────────────────────────┘      └─────────────────────────┘
                                                        │
                                                        ▼ (new events only in fork)
┌─────────────────────────┐      ┌─────────────────────────┐
│                         │      │ Event 5: config change  │  (fork-only)
│                         │      │ Event 6: request D      │  (fork-only)
└─────────────────────────┘      └─────────────────────────┘
```

**Implementation:** Persistent data structure (structural sharing) or copy-on-write with event IDs. Fork = new scenario row with `parent_scenario_id` + `fork_event_id`. Queries merge parent events up to fork point + fork's own events.

### 5.3 Rewind = Read-Only View

- UI selects event `N` → filters events to `[1..N]` → applies config changes in order → shows resulting state
- No mutation. User can "fork from here" or "return to latest"

### 5.4 Replay

- Select events `[A..B]` from any visible scenario
- Re-send in original order against target scenario's current config
- Record as new events in target scenario with `originalEventId` link
- Optional: force same seed for deterministic comparison

---

## 6. Mock Server Architecture

### 6.1 Per-Scenario Isolation

Each scenario has its own mock URL: `https://mock.tramus.dev/{scenario_token}/{path}`

- `scenario_token` = unguessable, rotatable, separate from share tokens
- Route matching: method + path template (params like `:id`)
- Specificity: fixed segments > parameters

### 6.2 Request Processing Pipeline

```
Incoming Request
      │
      ▼
┌─────────────────┐
│ Match Endpoint  │ ──No match──► 404 (structured, logged)
└────────┬────────┘
         │ Match
         ▼
┌─────────────────┐
│ Evaluate Rules  │ (ordered, first-match-wins)
│ - Condition AST │
│ - Value extract │
│ - Operators     │
└────────┬────────┘
         │ Match / Default
         ▼
┌─────────────────┐
│ Select Response │ (named response or default)
└────────┬────────┘
         ▼
┌─────────────────┐
│ Apply Latency   │ (fixed / range / seeded random)
└────────┬────────┘
         ▼
┌─────────────────┐
│ Apply Faults    │ (probabilistic / patterned / timeout)
│ First triggered │
└────────┬────────┘
         ▼
┌─────────────────┐
│ Record Event    │ (async, non-blocking, retry on failure)
└────────┬────────┘
         ▼
    Respond
```

### 6.3 Substitution Tokens

| Token | Example | Source |
|-------|---------|--------|
| `{{req.header.X-Request-Id}}` | `abc-123` | Request header |
| `{{req.query.page}}` | `2` | Query param |
| `{{req.param.id}}` | `42` | Path param |
| `{{req.body.user.email}}` | `jane@example.com` | JSON body field |
| `{{uuid}}` | `550e8400-e29b...` | Generated |
| `{{now}}` | `2026-10-18T12:00:00Z` | Current time |
| `{{counter}}` | `42` | Request counter |

---

## 7. Deployment & Infrastructure

### 7.1 Monorepo Build Pipeline (Turborepo)

```
turbo run build
├── @tramus/protocol → typecheck only (no build output)
├── @tramus/db → prisma generate
├── @tramus/extension → wxt build (chrome-mv3 + firefox)
├── server → tsc / bun build
└── web → next build (Turbopack)
```

### 7.2 CI/CD

- **PR:** lint + typecheck + unit tests + build (all workspaces)
- **Main:** Deploy web to staging, upload extension zip as artifact
- **Release (tag):** Production build → verify zip (no localhost, no workspace: refs, correct permissions) → manual store upload

### 7.3 Environments

| Env | Web URL | Extension Origins | Mock Domain |
|-----|---------|-------------------|-------------|
| Dev | `http://localhost:3000` | `http://localhost:3000` | `http://localhost:8000` |
| Staging | `https://staging.tramus.dev` | `https://staging.tramus.dev` | `https://mock-staging.tramus.dev` |
| Prod | `https://app.tramus.dev` | `https://app.tramus.dev` | `https://mock.tramus.dev` |

---

## 8. Extension ↔ Web App Communication Protocol

### 8.1 Message Flow

```
Detection (on load):
  Web: postMessage({ source: "tramus-web", type: "ping" })
  Content: receives → runtime.sendMessage({ type: "ping" })
  Background: replies { type: "pong", version }
  Content: postMessage({ source: "tramus-ext", type: "pong", version })
  Web: resolves isExtensionInstalled()

Request:
  Web: postMessage({ source: "tramus-web", type: "request", id, request })
  Content: validates → runtime.sendMessage({ type: "request", request })
  Background: executes → replies { type: "response", result }
  Content: postMessage({ source: "tramus-ext", type: "response", id, result })
  Web: resolves pending[id]

Streaming (T-014):
  Web: postMessage({ type: "request", stream: true, ... })
  Content: runtime.connect({ name: "stream-" + id })
  Background: onConnect → fetch streaming → port.postMessage(chunk)
  Content: onMessage → postMessage(chunk) to page
  Web: receives chunks incrementally
```

### 8.2 Protocol Versioning

- `version` in pong = `browser.runtime.getManifest().version`
- Additive-only changes to `@tramus/protocol`
- Web app handles missing fields gracefully
- Extension handles unknown message types by ignoring

---

## 9. Key Technical Decisions (ADRs)

| ADR | Decision | Rationale |
|-----|----------|-----------|
| **ADR-001** | Turborepo monorepo | Shared protocol, coordinated builds, single CI |
| **ADR-002** | WXT for extension | Manifest V3, TypeScript, Vite, multi-browser |
| **ADR-003** | postMessage + runtime.sendMessage bridge | No `externally_connectable` needed, works cross-origin |
| **ADR-004** | Optional host permissions + popup grant | Least privilege, Chrome Web Store review friendly |
| **ADR-005** | DeclarativeNetRequest for header overrides | MV3 compatible, session rules, no persistent rules |
| **ADR-006** | webRequest for observation only | `extraHeaders` needed for Set-Cookie, redirects |
| **ADR-007** | Prisma + PostgreSQL | Type-safe DB, migrations, relational data model |
| **ADR-008** | S3 for snapshots + large bodies | Cost-effective, encrypted, signed URLs |
| **ADR-009** | Event sourcing for timeline | Immutable history, rewind/fork natural fit |
| **ADR-010** | Structural sharing for fork | Fast fork regardless of history size |

---

## 10. Future Considerations

- **WebSocket support:** Requires offscreen document in MV3
- **Cookie jar:** Needs data model + privacy review
- **Collaborative editing:** CRDT or operational transform on endpoint config
- **GraphQL endpoints:** Protocol already extensible (method + path + body)
- **Real-time sync:** WebSocket or Server-Sent Events from backend
- **Extension auto-update:** Chrome handles, Firefox needs AMO