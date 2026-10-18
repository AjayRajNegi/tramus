# Tramus: Project Requirements

*Version 1.1 · Based on codebase analysis + original requirements · Status: living document*

---

## 1. Purpose and Scope

Tramus is a **lightweight web app + browser extension** for API endpoint testing. The core differentiator is **timeline branching** — treating API state like version control: rewind, fork scenarios, modify mocks, replay, compare.

**Target users:** Small developers/teams who want a fast, customizable, browser-based tool with no account required.

---

## 2. Core User Journey (MVP)

1. Define API endpoints (method, path, headers, query, body, responses, rules)
2. Execute requests against mock server
3. See requests on visual network timeline (waterfall + git-graph lanes)
4. Rewind to any prior event (read-only view)
5. Fork from any event → new named scenario
6. Modify mock behavior in fork
7. Replay requests against forked scenario
8. Compare scenarios (config diff + paired responses)
9. Share workspace/scenario via unguessable URL (snapshot or live)
10. Inspect request history + waterfall

---

## 3. Four Pillars (Web App)

| Pillar | Description |
|--------|-------------|
| **Timeline Branching** | Version control for API/network state — the main differentiator |
| **Mock Server** | Stable unguessable URLs per scenario, conditional rules, latency/error simulation |
| **Shareable URLs** | Opaque tokens, snapshot vs live links, view/use/edit permissions, revocation |
| **Endpoint Editor** | Visual builder for method, path, headers, query, body, auth, responses, rules |

---

## 4. Browser Extension (Interceptor)

**Purpose:** Let web app call localhost/private-network endpoints that browsers block (CORS, mixed content, private network access).

- Built with **WXT** (Manifest V3)
- Targets: Chrome, Edge, Firefox
- Web app detects extension → sends requests through it for local/blocked targets
- Results appear on timeline marked as extension-origin
- Least privilege: per-host consent via popup, no blanket `<all_urls>` in production

---

## 5. Mandated Stack

| Area | Technology |
|------|------------|
| Monorepo | Turborepo |
| Frontend | Next.js 16 + React 19, **motion** (Framer Motion) for timeline |
| Backend | Node.js |
| Database | PostgreSQL + Prisma |
| Storage | AWS S3 (snapshots, large payloads) |
| Extension | WXT framework |
| Package Manager | Bun |

---

## 6. Functional Requirements (Implemented/In-Progress)

### 6.1 Endpoint Editor (FR-ED) — **Partially Done**
- ✅ Visual definition: method, path, headers, query, body, auth
- ✅ Body types: none, JSON (CodeMirror), form, raw
- ✅ Auth types: none, bearer, basic
- ✅ Keyboard navigation, disabled rows, duplicate keys allowed
- ⏳ Multiple named responses per endpoint
- ⏳ Conditional response rules builder
- ⏳ Undo/redo within session
- ⏳ OpenAPI 3.0 export

### 6.2 Mock Server (FR-MS) — **Not Started**
- Stable unguessable URL per scenario
- Method + path template matching
- Permissive CORS + preflight
- Substitution tokens (header, query, path param, body field, UUID, time, counter)
- Response isolation (sandbox headers, no caching)
- Rotatable mock URL key
- Rate limiting per workspace

### 6.3 Conditional Rules (FR-RL) — **Not Started**
- Visual rule builder: IF condition THEN response
- Sources: header, query, path param, JSON body field, method
- Operators: equals, not equals, gt/gte/lt/lte, in/not in, contains, starts/ends with, pattern, exists, type check
- Combinators: all, any, not
- First-match-wins, default fallback
- **No user code execution** — data interpreted by fixed logic
- Deterministic, side-effect free, linear-time pattern matching
- Rule tester in UI

### 6.4 Latency/Error Simulation (FR-SIM) — **Not Started**
- Fixed latency, range (random), HTTP errors, timeouts, intermittent failures
- Probabilistic (X%) or patterned (every Nth)
- Order: choose response → apply latency → apply faults
- Reproducible from per-scenario seed
- Record realized latency/fault on event

### 6.5 Timeline & Scenario Branching (FR-TL) — **Not Started**
- Every workspace starts with `main` scenario
- Every config change + request = immutable ordered event
- Request events record exact endpoint config at time of execution
- Append-only history (rewind/fork/replay never delete)
- **Rewind:** read-only view at any event
- **Fork:** new scenario from event, inherits history, fast (<1s for 5k events), no history duplication
- **Replay:** re-send recorded requests in order against target scenario
- Scenarios: named, renamed, archived
- No merge in v1

### 6.6 Network Waterfall UI (FR-WF) — **Not Started**
- Visual timeline + waterfall per scenario (lanes like git graph)
- Row: start time, duration, latency, status, endpoint, ordering, scenario, state
- Inspector: request/response, headers, body, matched rule, simulated latency/fault, config at time
- Scrub playhead, select, rewind, fork, replay
- 60fps with 5k events, keyboard operable
- Real-time or event-order axis (default: event order)

### 6.7 Request Log (FR-LG) — **Not Started**
- List: timestamp, method, path, status, duration, response size, scenario, request ID
- Filter (method, status class, scenario, endpoint, time), search (path, ID), sort
- Phase 2: live streaming
- Log + timeline = same history, never disagree

### 6.8 Scenario Comparison (FR-CMP) — **Not Started**
- Config diff per endpoint
- Replayed request pairs: status, body, latency diff
- Summary stats: status counts, p50/p95 latency, error rate
- Optional forced same seed
- MVP: config diff + paired-response table

### 6.9 Shareable URLs (FR-SH) — **Not Started**
- Opaque 256-bit token in URL (no IDs)
- Two kinds: **snapshot** (immutable) + **live** (current state)
- Permissions: view / use (fork own copy) / edit
- Open as my copy → new owned workspace
- Expiry + instant revocation
- Owner token in creator's browser + downloadable recovery link
- Rate limited, no referrer leak, no indexing
- Snapshots in private encrypted S3, time-limited signed URLs (5 min)

### 6.10 OpenAPI Export (FR-OA) — **Not Started**
- Export REST endpoints as OpenAPI 3.0 (JSON/YAML)
- Direct mapping from stored definitions
- Infer schema from examples where missing (labeled inferred)
- Rules/behavior as vendor extensions (opt-in)
- Validates against OpenAPI validator

### 6.11 Browser Extension (FR-EX) — **In Progress (T-001, T-002 Done)**
- ✅ WXT scaffold, background executor, content script bridge
- ✅ Web app detects extension (ping/pong)
- ⏳ T-003: Web client `sendViaExtension()` + `sendRequest()` integration
- ⏳ Full draft serialization (T-004)
- ⏳ Error codes, timeout, error UI (T-005)
- ⏳ Abort in-flight (T-006)
- ⏳ Proxy fallback + install banner (T-007)
- ⏳ Binary responses + size cap (T-008)
- ⏳ Binary/file request bodies (T-009)
- ⏳ Forbidden header overrides (T-010)
- ⏳ Env-driven origin allowlist (T-011)
- ⏳ Least-privilege permissions + popup (T-012)
- ⏳ Safe response rendering (T-013)
- ⏳ Streaming responses (T-014)
- ⏳ webRequest: Set-Cookie, redirects, timing (T-015)
- ⏳ E2E tests (T-016)
- ⏳ Firefox build (T-017)
- ⏳ Production build + release (T-018)
- ⏳ Store assets + privacy policy (T-019)
- ⏳ Chrome Web Store submission (T-020)
- ⏳ Store link, docs, runbook (T-021)

---

## 7. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Main route <200KB gzipped JS, interactive <2s; editor <100ms; mock overhead p95 <10ms; timeline 200 events <100ms with 100k stored; heavy components load on demand |
| **Security** | No user code on servers; mock content isolated (different registrable domain); no outbound requests to user URLs; secrets from secure random (96+ bits, 256 for share/owner); constant-time token compare; rate limited public routes; input size/depth limits; strict CSP; no user content as executable HTML; secrets never in logs; dedicated security tests |
| **Reliability** | Event write failure ≠ mock response failure (retry); anonymous workspaces expire after 30 days inactivity; stale saves detected on concurrent edits |
| **Accessibility** | WCAG 2.1 AA for editor/inspector; timeline keyboard-only |
| **Compatibility** | Web: latest 2 Chrome/Edge/Firefox/Safari; Extension: Chrome/Edge/Firefox |
| **Observability** | Structured logs + request IDs, traces, metrics; unit tests 90% (timeline, rules, sim); property-based for rule safety; contract tests for APIs + extension messages; E2E for core journey; golden files for OpenAPI; PR blocked on typecheck, lint, tests, bundle size |

---

## 8. Limits & Defaults

| Limit | Default |
|-------|---------|
| Endpoints/workspace | 100 |
| Workspace config size | 512 KB |
| Request/response body | 1 MB each |
| Rules/endpoint | 20 |
| Conditions/rule / nesting | 50 / 5 |
| Pattern length | 200 chars |
| Latency/timeout cap | 30 seconds |
| Scenarios/workspace | 20 |
| Retained request events/scenario | 5,000 (config changes never pruned) |
| Snapshot size / count | 10 MB / 50 |
| Mock rate limit | 50 req/s, burst 100 |
| Extension response size / timeout | 10 MB / 30s |
| Anonymous workspace expiry | 30 days inactivity |

---

## 9. Release Phases

| Phase | Scope | Exit Criteria |
|-------|-------|---------------|
| **0: Foundation** | Monorepo, CI, stack running locally, deployable skeleton | CI green, sample workspace save/load |
| **1: MVP (Web Only)** | Editor, mock server, rules, simulation, timeline (rewind/fork/replay), log, basic compare, anonymous workspaces, share links, OpenAPI export | Full journey (section 2) + share snapshot link + open as different user |
| **2: Power Features** | WXT extension, live streaming, full compare UI, workspace file export/import, optional private mock mode | Extension acceptance passes on Chrome + Firefox |
| **3: Accounts & Teams** | Sign-in, team workspaces, roles, claim anonymous, collaboration | — |
| **4: Integrations** | GitHub versioning, GraphQL endpoints, text syntax for rules | — |

---

## 10. Success Measures

- New user sends first successful mock request within 60s
- Full journey completes without documentation
- Performance budgets hold in CI
- Zero known ways to run user code on servers or guess share links

---

## 11. Non-Goals (v1)

- Full Postman replacement (no collection runner, monitors, scripting, gRPC, WebSocket)
- Scenario merge
- Server-side forwarding to user URLs
- GitHub sync, accounts, teams

---

## 12. Open Questions (from original + codebase)

1. Domains/hosting provider — [any container host]
2. Anonymous workspaces may hand out edit links — [yes, revocable by owner]
3. Extension records real browser tab traffic — [no; executor only until Phase 3]
4. Sign-in method for Phase 3 — [decide in Phase 3]
5. Retention for account tiers — [decide in Phase 3]
6. **New:** Proxy fallback (`/api/proxy`) — keep in production or remove?
7. **New:** Response panel UI design — side panel vs bottom pane?
8. **New:** Real-time collaboration model for Phase 3?