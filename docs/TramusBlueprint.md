# Tramus — Engineering Blueprint

**Git for network state.** A visual REST/GraphQL mocker with a rewindable, branchable network timeline.

> Naming note: the source spec alternates between "Phantom" and "Tramus." This document uses **Tramus** exclusively.

---

## 0. Challenging the Product Assumptions

Before architecture, the risky assumptions worth naming out loud:

| Assumption | Risk | Simpler alternative |
|---|---|---|
| "Timeline branching" should feel like Git from day one | Users don't think in commits/branches for API mocking; it's a big conceptual ask before they've seen value | Ship a boring mock server first. Introduce "scenario" as a UI-friendly word; only call it "branching" once the value is obvious |
| Every request should generate a permanent immutable timeline event | At real traffic volumes (dev looping a UI against the mock) this is a lot of writes for something mostly thrown away | Log requests cheaply (append-only log, no branching semantics) in MVP; promote to full timeline events only once branching ships |
| Anonymous, no-login sharing is required from MVP | Anonymous write access to a "mock server" is a standing SSRF/abuse vector from day one — this is a security decision, not just a UX one | Anonymous **read/use** links are fine; anonymous **edit** access needs a soft identity (e.g., an owner token in a cookie) even pre-auth, so you're not building an open API defacement tool |
| GraphQL parity is designed in from the start | GraphQL mocking (schema-aware resolvers, introspection) is a different problem from REST route matching; conflating them early bloats the core routing engine | Design the mock-engine package around a `MockRequest -> MockResponse` interface so GraphQL is a second adapter later, not a parallel rebuild |
| The rule engine needs to support arbitrary logical richness immediately | Users will ask for "just let me write JS" — this is an RCE trap if you say yes | A declarative, JSON-Schema-validated condition tree (AND/OR/NOT of typed comparisons) covers ~95% of mocking needs without an interpreter |
| Branch comparison ("diff scenarios") is core MVP-adjacent | Diffing two divergent request/response histories is genuinely hard (matching corresponding requests across branches) and easy to sink weeks into | Ship it as "view branch B's log next to branch A's log," not a semantic diff, until there's real usage signal it's needed |
| Real-time streaming is needed immediately | WebSocket infra for a feature used by one browser tab open on `localhost` most of the time is premature | Short-poll (1–2s) the request log; upgrade to SSE only once a shared/team workspace makes real concurrency real |

These aren't reasons to reject the product — the "Git for network state" idea is the differentiator and is worth protecting. They're reasons to sequence it so the differentiator is *earned* after a working, boring mock server exists.

---

## 1. Product Architecture

```
                         ┌───────────────────────────┐
                         │        Browser (User)      │
                         └──────────────┬─────────────┘
                                        │ HTTPS
                 ┌──────────────────────┼───────────────────────┐
                 │                      │                       │
                 ▼                      ▼                       ▼
        ┌────────────────┐   ┌───────────────────┐   ┌────────────────────┐
        │  Next.js Web    │   │  App API (Node)    │   │ Mock Server (Node) │
        │  (apps/web)     │──▶│  apps/server:api   │   │ apps/server:mock    │
        │  UI, editor,    │   │  workspace CRUD,    │   │  public-facing,     │
        │  timeline, auth │   │  auth, share links,  │   │  route matcher,      │
        └────────────────┘   │  OpenAPI export      │   │  rule evaluator,     │
                              └─────────┬───────────┘   │  latency sim         │
                                        │                └──────────┬──────────┘
                                        │                            │
                        ┌───────────────┼────────────────────────────┘
                        ▼               ▼
                ┌───────────────┐  ┌─────────────┐
                │  PostgreSQL    │  │   AWS S3     │
                │  workspaces,   │  │  snapshots,   │
                │  endpoints,    │  │  OpenAPI      │
                │  events, logs  │  │  exports,     │
                │  (via Prisma)  │  │  large bodies │
                └───────────────┘  └─────────────┘
                        ▲
                        │ (V1+)
                ┌───────────────┐
                │ Redis (opt.)   │
                │ pub/sub for    │
                │ live log tail  │
                └───────────────┘
```

**Responsibilities**

- **Next.js frontend** — endpoint editor, timeline/waterfall UI, request log viewer, share-link management, auth UI (V1). Talks only to the App API, never directly to the database or S3.
- **App API server** — the "control plane." Workspace/endpoint/scenario CRUD, auth, share-link issuance, OpenAPI export, timeline query endpoints. This is what the frontend calls.
- **Mock server** — the "data plane." A deliberately thin, fast process that resolves `{workspace, scenario} + incoming HTTP request -> response`, applies latency/error simulation, and asynchronously emits a log/event. This is what *external* traffic (the user's app under test) hits.
- **PostgreSQL** — source of truth for everything structured and relational: workspaces, endpoints, rules, scenarios/branches, timeline events (metadata), request logs, share links.
- **S3** — large/opaque blobs: full request/response bodies over a size threshold, point-in-time workspace snapshots (JSON exports), OpenAPI export artifacts. Never the source of truth for anything queryable.
- **Redis (introduced in V1, not MVP)** — pub/sub fan-out for live request-log streaming to multiple connected browser tabs, and short-TTL caching of "active scenario resolution" for hot workspaces. See §17 for why it's *not* in the MVP.
- **Auth** — none in MVP (anonymous workspaces with an owner secret in an HttpOnly cookie + a share token in the URL). Real accounts arrive in V1 for team workspaces (see §9).

The App API and Mock server are two entry points into the **same backend codebase** (`apps/server`), not two separate services in MVP — see §2 for why, and §19 for when to actually split the process.

---

## 2. Recommended Repository Structure

```
tramus/
├── apps/
│   ├── web/                  # Next.js app
│   └── server/                # Node backend — TWO entrypoints, one deployable unit initially
│       ├── src/api/            # control-plane routes (workspaces, endpoints, scenarios...)
│       ├── src/mock/           # data-plane routes (the public mock server)
│       └── src/index.ts        # boots both on the same process/port range in MVP
│
├── packages/
│   ├── db/                    # Prisma schema + generated client + migrations
│   ├── types/                 # shared TS types/DTOs (Endpoint, Scenario, TimelineEvent...)
│   ├── validation/             # zod schemas for API payloads, shared client+server
│   ├── mock-engine/            # route matcher + rule evaluator + latency/error sim (pure, no I/O)
│   ├── timeline/                # event/branch model, state reconstruction, snapshotting
│   ├── ui/                      # shared design-system components (buttons, panels)
│   └── config/                  # eslint/tsconfig/tailwind shared config
│
├── turbo.json
└── package.json
```

**Why this shape and not more granular:**

- **`mock-engine` and `timeline` are separate packages from `apps/server`** because they are the intellectual property of the product and need to be unit-testable with zero I/O — pure functions in, pure data out. This also means they can later be reused by a CLI or a Playwright integration (§25) without depending on Express/Fastify.
- **No separate `sdk` package in MVP.** A public SDK is a stretch goal (§25); building it before there are external users is speculative work. Add it when someone actually needs to script against the API.
- **No separate `rules` package apart from `mock-engine`.** Rule evaluation is small enough and tightly coupled enough to route resolution that splitting it out is packaging for its own sake. Revisit only if the rule engine grows large enough to want independent versioning (e.g., if it becomes embeddable elsewhere).
- **`apps/server` is one deployable unit with two route trees, not two services**, because in MVP they share the same DB connection pool and the operational overhead of running/deploying two services for a project with (initially) one workspace's worth of traffic isn't justified. Section 19/24 explains exactly when to split the mock server into its own scaled-out service.

**Dependency boundaries (enforced via Turborepo + eslint import rules):**

```
apps/web        → packages/types, packages/validation, packages/ui
apps/server      → packages/db, packages/types, packages/validation,
                    packages/mock-engine, packages/timeline
packages/mock-engine → packages/types            (no db, no http)
packages/timeline    → packages/types, packages/db (interfaces only)
packages/db          → packages/types
```

`mock-engine` must never import `db` directly — it receives already-resolved data (the active scenario's endpoint set) as plain objects. This is what keeps it unit-testable and, later, portable (e.g., running mock resolution inside a CLI without spinning up Postgres).

---

## 3. Database Architecture

**Decision up front (justified in full in §18): PostgreSQL, via Prisma.**

```prisma
// packages/db/schema.prisma

model User {
  id           String   @id @default(cuid())
  email        String?  @unique
  createdAt    DateTime @default(now())
  memberships  WorkspaceMember[]
}

model Workspace {
  id            String   @id @default(cuid())
  name          String
  ownerId       String?               // null until V1 auth; anonymous owner uses ownerSecretHash
  ownerSecretHash String?             // MVP anonymous-edit auth (see §9)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  endpoints     Endpoint[]
  scenarios     Scenario[]
  timelineEvents TimelineEvent[]
  requestLogs   RequestLog[]
  shareLinks    ShareLink[]
  members       WorkspaceMember[]
  versions      WorkspaceVersion[]

  @@index([ownerId])
}

model WorkspaceMember {
  id          String   @id @default(cuid())
  workspaceId String
  userId      String
  role        MemberRole @default(EDITOR)
  createdAt   DateTime @default(now())

  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user        User      @relation(fields: [userId], references: [id])

  @@unique([workspaceId, userId])
}

enum MemberRole {
  OWNER
  EDITOR
  VIEWER
}

model Scenario {
  id          String   @id @default(cuid())
  workspaceId String
  name        String              // "main", "payment-failure"...
  parentId    String?             // forked from this scenario, null for root/"main"
  forkedAtEventId String?         // which TimelineEvent this scenario forked from
  isRoot      Boolean  @default(false)
  createdAt   DateTime @default(now())

  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  parent      Scenario? @relation("ScenarioFork", fields: [parentId], references: [id])
  children    Scenario[] @relation("ScenarioFork")
  endpoints   Endpoint[]
  events      TimelineEvent[]

  @@index([workspaceId])
  @@unique([workspaceId, name])
}

model Endpoint {
  id           String   @id @default(cuid())
  workspaceId  String
  scenarioId   String              // endpoints are scenario-scoped (see §4 for why)
  method       HttpMethod
  path         String              // "/api/users/:id"
  responseStatus Int      @default(200)
  responseHeaders Json     @default("{}")
  responseBody Json?
  latencyConfig Json?               // {type: "fixed"|"range"|"none", ms, min, max}
  errorConfig   Json?               // {type: "none"|"fixed"|"intermittent", statusCode, chance}
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  workspace    Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  scenario     Scenario  @relation(fields: [scenarioId], references: [id], onDelete: Cascade)
  rules        EndpointRule[]

  @@index([workspaceId, scenarioId])
  @@unique([scenarioId, method, path])
}

model EndpointRule {
  id          String   @id @default(cuid())
  endpointId  String
  priority    Int      @default(0)     // lower = evaluated first
  conditions  Json                     // condition tree, see §7
  response    Json                     // {status, headers, body}
  createdAt   DateTime @default(now())

  endpoint    Endpoint @relation(fields: [endpointId], references: [id], onDelete: Cascade)

  @@index([endpointId, priority])
}

// Append-only. Never updated, never deleted (except full branch deletion, see §5).
model TimelineEvent {
  id           String   @id @default(cuid())
  workspaceId  String
  scenarioId   String
  parentEventId String?             // previous event in this scenario's chain
  sequence     BigInt                // monotonically increasing per workspace, for ordering/pagination
  type         TimelineEventType     // REQUEST | ENDPOINT_CHANGE | BRANCH_CREATED
  payload      Json                  // shape depends on `type` — see §4
  createdAt    DateTime @default(now())

  workspace    Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  scenario     Scenario  @relation(fields: [scenarioId], references: [id], onDelete: Cascade)

  @@index([workspaceId, sequence])
  @@index([scenarioId, sequence])
  @@index([parentEventId])
}

enum TimelineEventType {
  REQUEST
  ENDPOINT_CHANGE
  BRANCH_CREATED
}

// Materialized checkpoints — an optimization, not a source of truth. See §4/§5.
model Snapshot {
  id          String   @id @default(cuid())
  scenarioId  String
  atEventId   String              // snapshot represents state as-of this event
  state       Json?               // small snapshots inline; large ones reference S3
  s3Key       String?
  createdAt   DateTime @default(now())

  scenario    Scenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)

  @@unique([scenarioId, atEventId])
}

// Separate from TimelineEvent — high-volume, short-lived, NOT part of branching semantics.
model RequestLog {
  id          String   @id @default(cuid())
  workspaceId String
  scenarioId  String
  requestId   String   @unique     // correlates to a TimelineEvent(type=REQUEST).payload.requestId
  method      String
  path        String
  statusCode  Int
  durationMs  Int
  responseSizeBytes Int?
  createdAt   DateTime @default(now())

  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([workspaceId, createdAt])
  @@index([scenarioId, createdAt])
}

model ShareLink {
  id          String   @id @default(cuid())
  workspaceId String
  scenarioId  String?             // null = "whatever scenario is active", pinned otherwise
  token       String   @unique    // random 128-bit, opaque
  permission  SharePermission @default(USE)
  expiresAt   DateTime?
  revokedAt   DateTime?
  createdAt   DateTime @default(now())

  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([workspaceId])
}

enum SharePermission {
  USE     // can call the mock server URL
  VIEW    // can open the read-only UI
  EDIT    // can open the editable UI (dangerous — see §9)
}

model WorkspaceVersion {
  id          String   @id @default(cuid())
  workspaceId String
  label       String              // e.g. git commit sha, or manual label
  s3Key       String              // full exported workspace.json in S3
  createdAt   DateTime @default(now())

  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([workspaceId])
}
```

Notes on the schema:

- **`Endpoint` is scenario-scoped, not workspace-scoped.** This is the single most important schema decision for enabling branching without a rewrite (detailed in §4). A naive "workspace has endpoints" model requires an expensive endpoint-copy-and-diff step the moment you add branching; scoping endpoints to scenario from day one means "fork a scenario" is just "copy endpoint rows with a new `scenarioId`" and MVP never has to know branching exists (a workspace just always has exactly one scenario, `main`).
- **`TimelineEvent` and `RequestLog` are deliberately separate tables.** `RequestLog` is what MVP §7 (Request Log) needs — cheap, queryable, filterable, no branching semantics, safe to prune/roll up later. `TimelineEvent` is the append-only backbone the branching model needs and is only populated once timeline/branching ships (V1). Conflating them forces every dev-loop request to pay the cost of full event-sourcing semantics from day one, which is the over-engineering trap called out in §23.
- **`Snapshot` is explicitly *not* authoritative** — see §4 for the reasoning.

---

## 4. Timeline Data Model

```
workspace
   └── scenario ("main", isRoot)
          └── TimelineEvent (sequence 1) ──▶ (sequence 2) ──▶ (sequence 3)
                                                                    │
                                              scenario "payment-success" forks here
                                                                    │
                                              ┌─────────────────────┴──────────────────────┐
                                              ▼                                              ▼
                                     scenario "payment-success"                    scenario "payment-failure"
                                     TimelineEvent(seq 1) ──▶ (seq 2)               TimelineEvent(seq 1) ──▶ (seq 2)
                                     (parentEventId = main's seq-3 event)           (parentEventId = main's seq-3 event)
```

**Key structural choices:**

- Each `TimelineEvent` belongs to exactly one `Scenario` and has a `sequence` number that is monotonic **within that scenario's own event chain**, plus a `parentEventId` pointing to the event it followed. A forked scenario's *first* event has `parentEventId` pointing at the event in the **parent scenario** it was forked from — that single pointer is the branch point. After that, the branch's own chain proceeds independently.
- This is a **DAG of scenarios, each an ordered event list**, not one giant global DAG of individual events. That's a deliberate simplification: modeling every event as an independent DAG node (like Git commits) is more general than needed, because within one scenario events are strictly linear — a scenario *is* a timeline, branching only happens at the scenario boundary. This keeps `getStateAt` and `replayScenario` linear-chain walks instead of general graph traversals.
- **Endpoint changes are themselves events** (`type: ENDPOINT_CHANGE`), not just rows updated in place — this is what makes "rewind to a previous network state" meaningful: state includes both requests *and* endpoint configuration at that point in time.

**Event payload shapes:**

```ts
type RequestEventPayload = {
  requestId: string;
  method: string;
  path: string;
  requestHeaders: Record<string, string>;
  requestBody?: unknown;
  matchedEndpointId: string;
  matchedRuleId?: string;
  responseStatus: number;
  responseBody: unknown;
  durationMs: number;
};

type EndpointChangeEventPayload = {
  endpointId: string;
  changeType: "created" | "updated" | "deleted";
  before: Partial<EndpointDTO> | null;
  after: Partial<EndpointDTO> | null;
};

type BranchCreatedEventPayload = {
  newScenarioId: string;
  forkedFromScenarioId: string;
  forkedFromEventId: string;
};
```

### What is the source of truth: events, snapshots, or both?

**Events are the sole source of truth. Snapshots are a derived, disposable performance optimization.**

Reasoning:

- A snapshot with no underlying event log is a dead end — you can't answer "what changed between event 4 and event 7," can't render the waterfall, can't attribute a state to *why* it happened. Since "inspect the request history" and "see requests on a timeline" are core product features (not optional), the event log has to exist regardless.
- Given the event log must exist, snapshots become purely an optimization to avoid replaying from the beginning every time (see §5's complexity discussion) — they should be **rebuildable at any time by replaying events**, and the system must behave correctly if every snapshot were deleted. That's the test for "is this actually a cache." If `Snapshot` rows disappeared and correctness broke, it would secretly be a source of truth in disguise — the schema is designed so that's not the case (`Snapshot.state` is always derivable from `TimelineEvent` rows for that scenario up to `atEventId`).
- The alternative — snapshots as source of truth, events as an audit log — was rejected because it inverts the product's own pitch. "Git for network state" implies the log *is* the state; a snapshot-primary model is closer to a plain mock server with save-slots, which doesn't support meaningful branching (you'd fork a blob, not a history).

**Branch deletion:** deleting a scenario cascades to its `TimelineEvent` rows and any `Snapshot` rows (Prisma `onDelete: Cascade`), but never touches the parent scenario's events, since the fork pointer lives on the *child's* first event, not the parent.

**Branch comparison (`diffScenarios`)** in MVP-of-this-feature (V1, not MVP) is implemented as: reconstruct both scenarios' endpoint state at their latest event, diff the endpoint sets by `(method, path)`, and separately show the two request logs side by side. A true causal diff (matching request N in branch A to the "same" request in branch B) is explicitly out of scope until there's evidence users want it — see §0.

---

## 5. State Reconstruction Algorithm

```text
# Append a new event to a scenario's chain. O(1).
function appendEvent(scenarioId, type, payload):
    lastEvent = db.timelineEvent.findLast({scenarioId}, orderBy: sequence desc)
    seq = lastEvent ? lastEvent.sequence + 1 : 1
    event = db.timelineEvent.create({
        scenarioId, sequence: seq,
        parentEventId: lastEvent?.id ?? null,
        type, payload
    })
    # Every N events (e.g. N=50), asynchronously enqueue a snapshot job — see below.
    if seq % SNAPSHOT_INTERVAL == 0:
        enqueueSnapshotJob(scenarioId, event.id)
    return event


# Fork a new scenario from a point in another scenario's history. O(E) where E = endpoints,
# NOT O(events) — this is why endpoints are materialized per-scenario (see §4).
function branchFrom(sourceScenarioId, atEventId, newName):
    sourceState = getStateAt(sourceScenarioId, atEventId)   # reconstructs endpoint set as of that event
    newScenario = db.scenario.create({
        workspaceId: source.workspaceId,
        name: newName,
        parentId: sourceScenarioId,
        forkedAtEventId: atEventId
    })
    for endpoint in sourceState.endpoints:
        db.endpoint.create({ ...endpoint, id: newId(), scenarioId: newScenario.id })
    appendEvent(newScenario.id, "BRANCH_CREATED", {
        forkedFromScenarioId: sourceScenarioId, forkedFromEventId: atEventId
    })
    return newScenario


# Reconstruct endpoint state as of a given event. This is the hot path to optimize.
function getStateAt(scenarioId, eventId):
    snapshot = db.snapshot.findLatestBefore(scenarioId, eventId)   # nearest snapshot <= eventId
    if snapshot:
        state = loadSnapshotState(snapshot)     # from Json column or S3
        startAfter = snapshot.atEventId
    else:
        state = {} # empty endpoint map
        startAfter = null

    events = db.timelineEvent.findMany({
        scenarioId, sequence: { greaterThan: startAfter's seq, lessOrEqual: eventId's seq }
    }, orderBy: sequence asc)

    for event in events:
        if event.type == "ENDPOINT_CHANGE":
            applyChangeToState(state, event.payload)
        # REQUEST and BRANCH_CREATED events don't mutate endpoint state

    return state


# Replay every REQUEST event in a scenario against its CURRENT endpoint config
# (used for "replay requests against the alternate scenario" after editing it).
function replayScenario(scenarioId, fromEventId = null):
    currentEndpoints = db.endpoint.findMany({ scenarioId })   # today's config, not historical
    requestEvents = db.timelineEvent.findMany({
        scenarioId, type: "REQUEST", sequence: { greaterThan: fromEventId?.sequence ?? 0 }
    }, orderBy: sequence asc)

    results = []
    for event in requestEvents:
        req = reconstructRequestFromPayload(event.payload)
        response = mockEngine.resolve(currentEndpoints, req)   # pure function, packages/mock-engine
        results.push({ original: event.payload, replayed: response })
    return results


# Compare two scenarios (MVP-of-branching version — endpoint diff + logs side by side).
function diffScenarios(scenarioIdA, scenarioIdB):
    stateA = getStateAt(scenarioIdA, latestEventOf(scenarioIdA))
    stateB = getStateAt(scenarioIdB, latestEventOf(scenarioIdB))
    endpointDiff = diffByKey(stateA.endpoints, stateB.endpoints, key = (method, path))
    return {
        endpointDiff,
        logA: db.requestLog.findMany({ scenarioId: scenarioIdA }),
        logB: db.requestLog.findMany({ scenarioId: scenarioIdB })
    }
```

**Performance / complexity:**

| Operation | Without snapshots | With snapshots (interval N) |
|---|---|---|
| `appendEvent` | O(1) | O(1) amortized (occasional async O(N) snapshot job) |
| `branchFrom` | O(endpoints) — not event count, by design | same |
| `getStateAt` | O(events since start) | O(events since nearest snapshot) ≈ O(N) worst case |
| `replayScenario` | O(request events) | same (snapshots don't help replay, only state lookup) |

Because `Endpoint` rows are already materialized per-scenario (current state always sitting in the `Endpoint` table, not derived on read), **`getStateAt` is only needed for *historical* lookups** — "what did this look like at event 12" — not for normal operation (serving live mock traffic reads `Endpoint` directly, O(1) lookup, no replay at all). This is the important performance property: **the hot path (serving a mock request) never touches the timeline/event system**; the event system only exists to answer "how did we get here" and "let me fork from there," which are comparatively rare, UI-driven operations. Snapshotting is therefore a nice-to-have for the timeline UI feeling snappy on very long-lived scenarios (thousands of events), not a requirement for MVP-of-branching — introduce it only once you observe `getStateAt` actually getting slow (a workspace with, say, >500 events in one scenario).

---

## 6. Mock Server Design

```
Incoming HTTP request
   │
   ▼
[1] Workspace resolver     — parse workspace id from URL/host, load once, cache in-process (short TTL)
   │
   ▼
[2] Scenario resolver      — which scenario is "active" for this workspace right now (see below)
   │
   ▼
[3] Route matcher          — match (method, path) against this scenario's Endpoint rows
   │
   ▼
[4] Rule evaluator          — run EndpointRule conditions against the request, in priority order
   │
   ▼
[5] Response resolver       — pick matched rule's response, or the endpoint's default
   │
   ▼
[6] Latency/error simulation — sleep / inject failure per endpoint config
   │
   ▼
[7] Response sent to caller
   │
   ├──▶ [8] Request log write     — synchronous-but-fast insert (see below)
   └──▶ [9] Timeline event emit   — ASYNC, fire-and-forget (queued, not on request path)
```

**What's synchronous vs asynchronous, and why:** steps 1–7 are on the critical path and must be fast (target: single-digit ms excluding intentional latency simulation). Step 8 (request log) is a single indexed insert — cheap enough to do inline, and useful enough (users expect the log to be there *immediately* after calling the endpoint) that deferring it would just move the complexity elsewhere for no real win. Step 9 (timeline event, V1+) is explicitly deferred to a background queue (in MVP-of-branching, an in-process `setImmediate`/microtask is enough; only move to a real queue — see §17 — once the mock server is a separately scaled service). The reason: timeline events matter for the *editor UI experience*, not for the caller of the mock endpoint, so they must never add latency to the response the caller is waiting on.

**Scenario resolution:** a workspace has one "active scenario" pointer at a time (stored on `Workspace` or resolved via the `ShareLink.scenarioId`, if the URL pins one). This is intentionally simple — the *mock server* doesn't do branching logic; it always resolves to a single concrete scenario and reads that scenario's `Endpoint` rows. Branching is purely an editor-time/timeline-time concept; the data-plane request path never reconstructs history.

**Route matching:** use `path-to-regexp` (the library Express itself uses) rather than a hand-rolled matcher — it already solves path params (`/users/:id`), gives you a well-understood syntax, and is battle-tested for edge cases (trailing slashes, optional segments). Building a custom matcher would be solving an already-solved problem and is exactly the kind of infra-for-its-own-sake the constraints warn against.

- **Path params** — extracted by `path-to-regexp`, exposed to the rule engine as `request.params.id`.
- **Query params** — parsed via the standard `URL` API, exposed as `request.query.foo`.
- **Headers / body / content-type** — normalized into the same `MockRequest` shape the rule engine consumes (see §7).
- **Route priority** — more specific paths win over wildcard/param paths when both could match (`/users/active` beats `/users/:id`); implement by sorting registered routes with static segments ranked above param segments ranked above wildcards, computed once per scenario when its endpoint set changes (not per-request).
- **Rule priority** — `EndpointRule.priority`, ascending, first matching rule wins; if none match, fall back to the endpoint's own default `responseStatus`/`responseBody`.

---

## 7. Conditional Rule Engine

A declarative condition tree — no `eval`, no embedded scripting language, no sandboxed VM. This is a hard requirement, not a style preference (see §16).

```json
{
  "conditions": {
    "operator": "AND",
    "rules": [
      { "field": "request.headers.x-user-type", "operator": "equals", "value": "premium" },
      { "field": "request.body.amount", "operator": "greaterThan", "value": 10000 }
    ]
  },
  "response": {
    "status": 422,
    "headers": { "content-type": "application/json" },
    "body": { "error": "amount_too_large" }
  }
}
```

**Supported operators (v1 set — deliberately small):**

| Operator | Applies to | Notes |
|---|---|---|
| `equals` / `notEquals` | string, number, boolean | strict after type coercion pass |
| `contains` | string, array | substring or array-membership |
| `matches` | string | regex, compiled once at rule-save time with a safe subset (no backtracking bombs — reject via `safe-regex` check on save) |
| `greaterThan` / `lessThan` / `greaterOrEqual` / `lessOrEqual` | number | |
| `exists` / `notExists` | any field | presence check, useful for optional headers |
| `in` | any | value ∈ provided array |

**Field access:** `field` is a restricted dot-path into a fixed schema (`request.headers.*`, `request.query.*`, `request.params.*`, `request.body.*`, `request.method`, `request.path`) — resolved via safe property lookup (no `eval`, no `Function()`), with array indices allowed (`request.body.items[0].sku`). Unknown/malformed paths resolve to `undefined` rather than throwing, so a bad rule degrades to "doesn't match" rather than 500ing the mock server.

**Type coercion:** request data arrives as strings (headers, query) or parsed JSON (body). Before comparison, both sides are coerced toward the rule value's declared type: if `value` is a number, the extracted field is `Number()`-coerced (with `NaN` treated as no-match, not an error); if `value` is boolean, `"true"/"false"` strings coerce; string operators never coerce numbers into strings implicitly. This avoids the classic `"10" < "9"` string-comparison bug in a system where header values are always strings.

**AND/OR/NOT nesting:** `conditions` is a tree (`{operator: "AND"|"OR", rules: [...]}`, where a `rules` entry can itself be a nested group), evaluated recursively, short-circuiting. Depth is capped (e.g., 5 levels) and rule-count is capped (e.g., 20 leaf conditions) at save time via the `validation` package's zod schema — this bounds worst-case evaluation time and prevents pathological rule trees, which matters because rule evaluation sits on the mock server's hot path.

**Validation & security at save time (not request time):**
- zod schema validates the shape (no arbitrary keys, no code strings anywhere in the JSON).
- Regex values are checked against a "safe regex" complexity heuristic before being persisted, so a malicious/careless regex can't cause catastrophic backtracking on the request path (a real DoS vector for any rule engine that accepts user regex).
- Field paths are validated against the fixed allowlist of root namespaces (`request.*` only) — nothing that could reach into process internals, environment, or other workspaces' data.

This is intentionally boring and small. It is fast (pure object traversal + comparisons, no interpreter startup, no sandboxing overhead) and it is safe by construction because there is no code execution surface at all — "safe" isn't a sandbox around arbitrary code, it's the absence of an execution primitive.

---

## 8. API Design

All endpoints under `/api/v1`. Auth in MVP = owner-secret cookie (see §9); `Authorization: Bearer` added in V1.

```text
POST   /workspaces
GET    /workspaces/:id
PATCH  /workspaces/:id

POST   /workspaces/:id/endpoints
GET    /workspaces/:id/endpoints?scenarioId=
PATCH  /workspaces/:id/endpoints/:endpointId
DELETE /workspaces/:id/endpoints/:endpointId

POST   /workspaces/:id/scenarios                 # branch
GET    /workspaces/:id/scenarios
GET    /workspaces/:id/scenarios/:scenarioId
DELETE /workspaces/:id/scenarios/:scenarioId

GET    /workspaces/:id/timeline?scenarioId=&cursor=
GET    /workspaces/:id/timeline/:eventId/state    # getStateAt

POST   /workspaces/:id/scenarios/:scenarioId/replay
GET    /workspaces/:id/scenarios/diff?a=&b=

GET    /workspaces/:id/logs?scenarioId=&cursor=&status=&method=

POST   /workspaces/:id/share-links
GET    /workspaces/:id/share-links
DELETE /workspaces/:id/share-links/:token

GET    /workspaces/:id/export/openapi
```

Two representative endpoints in full:

```ts
// POST /workspaces/:id/endpoints
// Purpose: create a mock endpoint within the workspace's active (or specified) scenario.
// Auth: owner-secret cookie must match workspace, or EDIT-permission share token.

type CreateEndpointRequest = {
  scenarioId?: string;      // defaults to workspace's active scenario
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;             // must start with "/", validated against path-to-regexp grammar
  responseStatus?: number;  // default 200
  responseHeaders?: Record<string, string>;
  responseBody?: unknown;
  latencyConfig?: LatencyConfig;
  errorConfig?: ErrorConfig;
};

type CreateEndpointResponse = {
  id: string;
  scenarioId: string;
  method: string;
  path: string;
  mockUrl: string;          // fully-formed https://<host>/<workspaceId>/<path>
  createdAt: string;
};

// Validation: path must be unique per (scenarioId, method); responseBody must be
// valid JSON and under a size cap (e.g. 256KB inline, larger bodies rejected with
// guidance to reference S3 in V1); latencyConfig/errorConfig validated against
// their zod unions.
```

```ts
// POST /workspaces/:id/scenarios
// Purpose: fork a new scenario ("branch") from a point in another scenario's history.
// Auth: owner-secret cookie or EDIT-permission share token.

type CreateScenarioRequest = {
  name: string;                  // unique within workspace
  forkFromScenarioId: string;
  forkAtEventId?: string;        // omit = fork from the latest event (HEAD)
};

type CreateScenarioResponse = {
  id: string;
  name: string;
  parentId: string;
  forkedAtEventId: string;
  endpointCount: number;         // how many endpoints were copied
};

// Validation: forkFromScenarioId must belong to this workspace; forkAtEventId (if given)
// must belong to forkFromScenarioId's chain; name must not collide with an existing
// scenario name in this workspace.
```

---

## 9. Shareable URL Architecture

**Two distinct kinds of "sharing" that must not be conflated:**

1. **Mock server URLs** (`https://mock.tramus.dev/<workspaceId>/api/users`) — this is the URL the *user's application under test* calls. It needs to be stable, fast, and doesn't need a secret token by default (it's meant to be embedded in app config), but it should not leak *other* workspaces' data — path-scoped by `workspaceId` is enough since each workspace's routes are isolated by construction (see §16 for why this alone isn't sufficient and what else is needed).
2. **Collaboration/editor share links** (`https://tramus.dev/share/<token>`) — this is what a user sends a teammate to open the *editor UI*. This is the one that needs careful token design.

**Editor share-link design:**

- `token` is a 128-bit random value (crypto-secure), stored hashed *or* plain with a unique index — plain is acceptable here since it's a bearer capability token by design (like a Google Docs share link), not a password; what matters is that it's unguessable (128 bits) and revocable.
- `permission` is `VIEW` or `USE` by default; `EDIT` links are opt-in and shown with an explicit warning in the UI ("anyone with this link can modify your workspace") because an anonymous-edit link is the highest-risk share type — it's effectively a bearer credential with write access and no accountability.
- `expiresAt` defaults to unset (no expiry) but the UI nudges users to set one for `EDIT` links specifically.
- `revokedAt` — revocation is a soft flag, not a delete, so audit/logging remains intact.
- The token is **not** the workspace ID — workspace IDs (`cuid`s) are also hard to guess but are used pervasively (in mock URLs, in API paths) and shouldn't double as the access-control mechanism; keeping them separate means rotating a compromised share link doesn't require changing the mock server URL everyone's app config points at.

**Anonymous-edit auth for the *owner* (MVP, pre-accounts):** when a workspace is created with no logged-in user, the server generates a random `ownerSecret`, sets it as an HttpOnly, Secure, SameSite=Lax cookie scoped to that workspace's path, and stores only its hash (`ownerSecretHash`) in the DB. This is what lets the *creator* keep editing their own workspace across sessions without an account, while distinguishing "the owner, from their own browser" from "someone who received a share link." A `VIEW`/`USE` share link never grants owner rights, regardless of what's in the requester's cookies.

**Evolution MVP → V1:**

```text
MVP:  anonymous workspace, owner-secret cookie, optional VIEW/USE/EDIT share tokens
  │
  ▼
V1:   real accounts (email or OAuth), WorkspaceMember roles (OWNER/EDITOR/VIEWER),
      share links become "invite links" that, once accepted, create a
      WorkspaceMember row instead of granting standing bearer access —
      i.e. share tokens become single-use invitations, not permanent capability tokens
```

This matters: a bearer-token share link is fine for "anonymous demo you send a colleague," but is the wrong model once you have real accounts — at that point you want *auditable, revocable-per-person* access (who did what), which requires converting link-based access into membership rows.

**Abuse prevention / rate limiting (mock server specifically, since it's the anonymous, public-facing surface):**

- Per-workspace rate limit (e.g., token bucket, ~50 req/s burst, configurable) to stop one workspace's mock traffic (or an attacker hammering a guessed workspace ID) from starving others on shared infrastructure.
- Global per-IP rate limit as a second layer against scanning many workspace IDs.
- Response body size caps and request body size caps (see §16).
- No workspace **listing/enumeration** endpoint ever exists — workspace IDs are unguessable `cuid`s and there's no index of "all workspaces" reachable from the API, so discoverability relies on not exposing an index rather than security-through-obscurity of the ID alone.

---

## 10. Frontend Architecture

```
apps/web/
├── app/
│   ├── (marketing)/                 # public landing, no workspace context
│   ├── w/[workspaceId]/
│   │   ├── layout.tsx                # workspace shell: scenario/share bar
│   │   ├── page.tsx                  # endpoint list + editor (default view)
│   │   ├── timeline/page.tsx         # network waterfall
│   │   └── logs/page.tsx             # request log
│   └── share/[token]/page.tsx        # resolves a share link -> redirects into /w/[id]
├── components/
│   ├── endpoint-editor/
│   ├── timeline/                     # Framer Motion-heavy
│   ├── request-log/
│   └── ui/                           # imports packages/ui
├── hooks/
│   ├── useWorkspace.ts               # react-query wrapper
│   ├── useEndpoints.ts
│   ├── useTimeline.ts
│   └── useScenario.ts
└── lib/api-client.ts                  # typed fetch wrapper using packages/types + validation
```

**State ownership:**

| State | Lives in | Why |
|---|---|---|
| Endpoint list, scenario metadata, timeline events, request logs | Server state via **TanStack Query** | All of it is DB-backed, multi-client-visible (once share links exist), and needs cache invalidation on mutation — react-query's model fits directly, no need for a separate global store |
| Currently-selected endpoint/timeline event, editor draft (unsaved form state) | Local React state (`useState`/`useReducer`) in the relevant component | Purely client-side, ephemeral, doesn't need to survive navigation |
| Active scenario id (which branch you're viewing) | URL search param (`?scenario=`) | Makes the view shareable/bookmarkable and avoids a duplicate source of truth against the server's "active scenario" concept |
| Auth/owner-secret | HttpOnly cookie, never touched by JS | Security: not readable by client-side code at all |

No Redux/Zustand/global client-store is introduced — react-query plus URL state plus per-component local state covers everything in this product; a global client store would be solving a problem that doesn't exist yet (there isn't cross-cutting client-only state that multiple unrelated components need to share).

**Optimistic updates:** applied specifically to endpoint edits (the highest-frequency mutation) — react-query's `onMutate` writes the edited endpoint into the cache immediately, editor UI reflects the change instantly, and rolls back on error. Timeline/branch operations are **not** optimistic — they're comparatively rare, and showing a fork "succeed" optimistically before the server has actually materialized the new scenario's endpoint rows risks a confusing UI state if it fails (e.g., name collision). A short loading state is the right tradeoff there.

---

## 11. Timeline UI Architecture

**Rendering strategy:** the waterfall is a horizontally-scrollable, time-scaled row of event "bars," not a full timeline-chart library — building it directly with absolutely-positioned divs/SVG driven by Framer Motion gives full control over the branch-fork visual (a row splitting into two sub-rows), which off-the-shelf Gantt/timeline libraries don't model well.

- **Virtualization:** only render events within the current scroll viewport (+ overscan buffer) using a windowing approach (e.g., `@tanstack/react-virtual`) keyed by each event's computed x-position from its timestamp; this is what makes "thousands of events" tractable — the DOM never holds more than ~50–100 event nodes regardless of total timeline length.
- **Zooming:** a zoom level scales the time-to-pixel ratio; recompute visible-window bounds on zoom change rather than re-rendering all events — combine with virtualization so zoom is cheap even on long timelines.
- **Scrubbing:** a draggable playhead reads pointer x-position, maps back to a timestamp/event via binary search over the (already time-sorted) event array — O(log n), not a linear scan per drag-frame.
- **Branch visualization:** each scenario renders as its own horizontal lane; a `BRANCH_CREATED` event draws a connecting Framer Motion `path`/`line` from the parent lane's fork-point x-position down to the new lane — animated in on scenario creation, not on every re-render.
- **Event selection / hover:** selecting an event triggers the `getStateAt` query for that event id (React Query, keyed by `[scenarioId, eventId]` so repeated hovers over the same event are cache hits) and highlights the corresponding endpoint state in the editor panel.
- **Animations:** Framer Motion `layout` animations for new events sliding into the timeline as they arrive (polled/streamed), and for lane-height changes when a branch is created/collapsed — kept to `transform`/`opacity` properties only, to stay on the compositor thread and avoid layout thrashing at high event counts.
- **Mapping to backend model:** each rendered "lane" = one `Scenario`; each rendered "bar" = one `TimelineEvent` of type `REQUEST` (ENDPOINT_CHANGE events render as small markers, not bars, since they have no duration); the fork connector = a `BRANCH_CREATED` event's `payload.forkedFromEventId` pointer, resolved to that parent event's x-position.
- **Performance ceiling:** with virtualization + windowed queries (`GET /timeline?cursor=`, not "fetch entire scenario history"), the UI should comfortably handle scenarios with 10k+ events; beyond that, the honest answer is that per-request timeline events stop being the right granularity for very long-running scenarios, and the product should nudge users toward starting a fresh scenario rather than trying to make one lane infinitely scalable.

---

## 12. MVP Implementation Plan

**Phase 0 — Project foundation**
- Objective: empty-but-real monorepo that builds, lints, and deploys a "hello world" on both apps.
- Backend: Express/Fastify skeleton, health-check route.
- Frontend: Next.js skeleton, one page.
- DB: Prisma initialized against local Postgres via Docker Compose.
- Tests: CI runs `turbo build lint test` successfully.
- DoD: a fresh clone + `docker compose up` + `pnpm dev` gets you a working local stack.
- Risks: none significant; keep this phase to 1–2 days, resist adding tooling beyond what's used immediately.

**Phase 1 — Workspace creation**
- Objective: user can create a workspace and it persists.
- Backend: `POST /workspaces`, `GET /workspaces/:id`, owner-secret cookie issuance.
- Frontend: "New workspace" flow, redirect into `/w/:id`.
- DB: `Workspace` + `Scenario` (auto-create `main` scenario on workspace creation).
- Tests: integration test for creation + ownership cookie check.
- DoD: creating a workspace gives you a URL you can revisit and it's still yours.
- Dependencies: Phase 0. Risk: deciding the ownership model early (owner-secret) — get this right now, since retrofitting auth onto "anyone can edit any workspace" later is painful.

**Phase 2 — Endpoint editor**
- Objective: user can define endpoints with static JSON responses.
- Backend: full Endpoint CRUD, path/method validation.
- Frontend: endpoint list + form editor (method, path, status, headers, body).
- DB: `Endpoint` model.
- Tests: unit tests for path validation; integration tests for CRUD.
- DoD: endpoints created in the UI persist and are listable.
- Risk: over-building the editor UI (rich JSON editing, syntax highlighting) before the mock server even works — keep this a plain textarea + JSON.parse validation in MVP; a nicer editor (e.g., Monaco) is a fast-follow, not a blocker.

**Phase 3 — Mock server**
- Objective: the actual point of MVP — endpoints are callable over HTTP.
- Backend: `apps/server/src/mock` route tree; workspace resolver, route matcher (`path-to-regexp`), response resolver; no rules or latency sim yet.
- Frontend: show the computed `mockUrl` next to each endpoint, "copy" button.
- DB: no new models.
- Tests: integration test hitting a real mock endpoint end-to-end.
- DoD: `curl https://.../<workspaceId>/api/users` returns the configured JSON.
- Dependencies: Phase 2. This is the single most important phase — everything else is additive on top of a working mock server.

**Phase 4 — Shareable URLs**
- Objective: someone else can use (not necessarily edit) the workspace via a link.
- Backend: `ShareLink` model + issuance endpoint; mock server already path-scoped by workspace ID so USE-sharing needs no extra work beyond exposing the URL — this phase is really about `VIEW` editor links.
- Frontend: "Share" button, link generation UI, `/share/:token` resolver page.
- DB: `ShareLink`.
- Tests: revoked/expired token rejected; VIEW token can't hit mutating endpoints.
- DoD: a logged-out browser can open a VIEW share link and see (not edit) the workspace.

**Phase 5 — Request logging**
- Objective: users can see what hit their mock server.
- Backend: `RequestLog` writes on every mock request; `GET /workspaces/:id/logs` with filter/sort/pagination.
- Frontend: log table view.
- DB: `RequestLog` + indexes.
- Tests: filter/sort correctness; log entry created per request.
- DoD: calling an endpoint 10 times shows 10 rows in the log, filterable by status/method.

**Phase 6 — Timeline foundation** *(start of V1, included here to show the seam)*
- Objective: introduce `TimelineEvent` without yet exposing branching in the UI.
- Backend: emit `REQUEST` and `ENDPOINT_CHANGE` events alongside existing request-log writes; `getStateAt` implemented and tested.
- Frontend: read-only waterfall view (no scrub/branch yet).
- DB: `TimelineEvent`.
- Tests: `getStateAt` correctness against known event sequences.
- DoD: the timeline page shows a chronological, non-interactive view of events.

**Phase 7 — Branching**
- Objective: the differentiator — fork, edit, replay.
- Backend: `branchFrom`, `replayScenario`, scenario-scoped endpoints already supported by schema from Phase 2 (no migration needed — this is the payoff of scoping `Endpoint` to `scenarioId` from day one).
- Frontend: "fork from here" on the timeline, scenario switcher, replay button.
- DB: `Scenario.parentId`/`forkedAtEventId` already exist.
- Tests: fork produces an independent, correctly-copied endpoint set; replay against edited fork returns the new response.
- DoD: the exact flow in §26 works end to end.

---

## 13. Exact MVP Build Order

```text
1.  Initialize Turborepo + pnpm workspaces
2.  Configure shared TypeScript config (packages/config)
3.  Set up Docker Compose (Postgres) for local dev
4.  Initialize Prisma in packages/db, write Workspace + Scenario + Endpoint models
5.  Run first migration, generate client
6.  Scaffold apps/server (Fastify/Express), health check route
7.  Build Workspace CRUD (control-plane) + owner-secret cookie auth
8.  Build Endpoint CRUD (control-plane)
9.  Build packages/mock-engine: pure route matcher + response resolver (unit-tested standalone, no HTTP)
10. Wire mock-engine into apps/server's mock route tree (data-plane)
11. Scaffold apps/web (Next.js), workspace creation flow
12. Build endpoint list + editor UI, wired to control-plane API
13. Surface mockUrl in UI; manual end-to-end test with curl/Postman against the mock server
14. Add ShareLink model + issuance + /share/:token resolver
15. Add RequestLog writes to the mock route + logs API + log UI
16. (V1 seam) Add TimelineEvent emission + getStateAt + read-only timeline UI
17. (V1) Add branchFrom/replayScenario + branching UI
```

**Why this order:** the data model for a *given* feature is always built one step before its UI, and the mock server (step 9–10) comes before any UI polish because it's the part of the product whose behavior everything else (logging, timeline, branching) depends on and observes. Endpoint CRUD (step 8) deliberately precedes the mock engine so there's real data to route against when building/testing step 9. Share links and logging (14–15) come after a working mock server rather than before, because they're observability/access layers *on top of* mock traffic that doesn't exist yet in earlier steps. Timeline/branching (16–17) are pushed last and explicitly marked as the V1 seam — building them earlier would mean building the harder, differentiating feature before validating the "boring" mock server actually works end-to-end, which is the highest-risk ordering mistake this project could make.

---

## 14. Week-by-Week Roadmap

*(Solo, experienced full-stack developer, realistic pace — not crunch estimates.)*

**MVP — Weeks 1–5**
- Week 1: Phase 0 + Phase 1 (foundation, workspace creation)
- Week 2: Phase 2 (endpoint editor, both API and UI)
- Week 3: Phase 3 (mock server) — the critical week
- Week 4: Phase 4 + Phase 5 (share links, request logging)
- Week 5: hardening — rate limiting, input validation edges, deploy pipeline, manual QA pass

**V1 — Weeks 6–11**
- Week 6–7: Phase 6 (timeline foundation, read-only)
- Week 8–9: Phase 7 (branching + replay)
- Week 10: conditional rule engine (§7) + latency/error simulation
- Week 11: accounts + team workspaces (auth, `WorkspaceMember`, converting share links to invites)

**Post-V1 — Weeks 12–15**
- Week 12: OpenAPI export
- Week 13: real-time log streaming (SSE), scenario comparison UI
- Week 14: performance pass on timeline UI (virtualization, snapshotting if needed)
- Week 15: GitHub-based workspace versioning (basic export/import, no bidirectional sync yet)

**Stretch — beyond Week 15**
- Browser extension for auto-generating endpoints from captured traffic
- Playwright integration package
- gRPC adapter

This assumes ~30 focused engineering hours/week and treats "V1" as genuinely optional scope that only starts once MVP is validated with real usage — not a fixed follow-on sprint regardless of what MVP feedback says.

---

## 15. Testing Strategy

**Unit tests** (fast, no I/O, live next to `mock-engine`/`timeline` packages):
- Route matching: param extraction, wildcard priority, method mismatch, trailing slash handling.
- Rule evaluation: each operator, AND/OR/NOT nesting, type coercion edge cases (numeric string vs number), malformed/unknown field paths degrading to no-match rather than throwing.
- Timeline operations: `appendEvent` sequence monotonicity, `branchFrom` producing an independent endpoint copy, snapshot interval logic.
- State reconstruction: `getStateAt` against hand-constructed event fixtures with known expected state, including the snapshot + replay-remainder path specifically (not just the no-snapshot path).

**Integration tests** (real Postgres via Docker in CI, real HTTP layer):
- Workspace CRUD including owner-secret cookie enforcement (can't edit someone else's workspace).
- Mock server: full request → route match → rule eval → response → log-write cycle against a seeded workspace.
- Branch creation: fork produces correct, isolated `Endpoint` rows; editing the fork doesn't affect the parent scenario's endpoints.
- Request logging: filter/sort/pagination correctness against a seeded log table.

**E2E tests (Playwright)** — the exact flow the product is built around:
```text
Create workspace
  → create endpoint (GET /api/users, static JSON)
  → open mock URL, assert response body
  → inspect request log, assert one entry
  → modify endpoint response
  → open timeline, select the pre-edit event, assert state shows old response
  → fork a new scenario from that event
  → edit the endpoint in the fork
  → call the same mock URL scoped to the fork
  → assert the forked response differs from main
```

**Test data strategy:** integration/E2E tests run against a dedicated test database, reset via Prisma's `migrate reset` (or a lighter truncate-between-tests strategy once the suite grows) rather than mocking Prisma — the branching/timeline logic is exactly the kind of thing that needs real relational integrity checked, not a mocked ORM. Seed data lives in `packages/db/seed` as small, composable factory functions (`createTestWorkspace()`, `createTestEndpoint()`) rather than large fixture JSON files, so individual tests stay readable and independent.

---

## 16. Security Model

| Risk | Mitigation |
|---|---|
| **SSRF** (endpoint response configured to somehow trigger server-side fetch) | The mock server never makes outbound requests on behalf of a configured endpoint — responses are pure static/rule-computed data, never a proxy/forward. If a future "proxy passthrough" feature is added, it must go through a strict allowlist + block private IP ranges (RFC1918, link-local, cloud metadata `169.254.169.254`) at the network layer, not just the app layer. |
| **Arbitrary code execution** | No `eval`, no `Function()`, no embedded scripting anywhere in the rule engine (§7) — this is architectural, not a filter. |
| **Malicious rules** (regex DoS, deep recursion) | Rule tree depth/count caps + regex complexity check at save time (§7); rule evaluation itself has no loops driven by user-controlled bounds. |
| **Path traversal** | Endpoint paths are matched via `path-to-regexp` against a fixed route table per workspace — there's no filesystem access keyed by user input anywhere in the mock path, so traversal has no target. |
| **Injection (SQL)** | Prisma parameterizes all queries; no raw SQL string interpolation from user input anywhere in the codebase (enforced by lint rule banning `$queryRawUnsafe`). |
| **Log injection** | Request log fields (headers, path) are stored as structured JSON/columns, not concatenated into free-text log lines that could be used to forge log entries; anything rendered in the UI is escaped by React by default. |
| **Share-token leakage** | Tokens are high-entropy (128-bit), never included in server logs (redact `token` query/path segments in access logs), transmitted only over HTTPS, revocable, and `EDIT`-permission tokens are visually flagged as high-risk in the UI. |
| **Unauthorized workspace access** | Owner-secret cookie (HttpOnly/Secure/SameSite) required for mutations absent a valid EDIT share token; VIEW/USE tokens are checked against `SharePermission` on every request, not just at link-resolution time. |
| **Rate limiting / DoS** | Per-workspace + per-IP token-bucket limits on the mock server (§9); control-plane API has its own, separate, generous-but-present limits to stop scripted abuse of workspace/endpoint creation. |
| **Request body limits** | Hard cap (e.g., 1MB) on both incoming requests to the mock server and configured response bodies, enforced at the HTTP framework level before parsing, to bound memory use per request. |
| **Malicious OpenAPI documents** (import path, if/when import is added) | Parse with a schema-validating library (not a permissive YAML/JS-eval-based parser), reject documents exceeding size/depth limits, never execute anything from `x-*` vendor extensions. |
| **Public mock server exposure generally** | Treat the mock server as a genuinely public, unauthenticated-by-default surface: assume any workspace ID that leaks (screenshot, log, referrer header) may be hit by unrelated traffic; ensure that's harmless (worst case is noisy request logs) rather than a security event, by never letting mock-server requests have any side effect beyond logging + returning configured data. |

The unifying principle: **the mock server has read-only relationship to workspace configuration and write-only relationship to logs** — it cannot mutate endpoint/scenario/rule data under any input, which collapses most of the above from "mitigation" to "not applicable by construction."

---

## 17. Performance Considerations

| Bottleneck | When it matters | Mitigation | Redis? |
|---|---|---|---|
| Route matching | Every mock request | Precompute/sort the route table per scenario on write, not per request (§6) | No |
| Rule evaluation | Every mock request with rules | Depth/count caps (§7) keep worst-case bounded; pure in-memory tree walk | No |
| Request logging | Every mock request | Single indexed insert; batch-flush if it ever becomes a bottleneck (unlikely before real scale) | No |
| Timeline event emission | Every mock request (V1+) | Fire-and-forget, off the response critical path (§6) | Maybe — see below |
| State reconstruction (`getStateAt`) | Timeline UI interaction, branch creation | Snapshot-every-N-events (§5); this is read-rarely, so caching isn't the first lever — reducing replay length is | No |
| Timeline rendering | Long-lived scenarios (1000s of events) | Virtualization + windowed pagination (§11), not a backend concern | No |
| Branch creation | User-initiated, infrequent | O(endpoints) copy, not O(events) — already cheap by schema design (§4/§5) | No |
| Real-time streaming | Multiple viewers of one workspace's live traffic | See below | **Yes, but only here** |
| Large workspaces (many endpoints) | Editor list rendering, route table rebuild | Paginate the endpoint list UI past ~200 endpoints; route table rebuild is O(endpoints), still cheap at realistic sizes (hundreds, not millions) | No |

**Where Redis is and isn't justified:** the only bottleneck in this list that genuinely needs a message-passing layer is **real-time streaming to multiple connected browser tabs**, and only once the mock server is a horizontally-scaled, multi-instance service (V1+/post-V1) — at that point a single process can no longer just hold an in-memory list of connected SSE clients and push to them directly, because a request logged on instance A needs to reach a browser tab connected to instance B. Redis pub/sub is the boring, well-understood answer *at that specific point*. Before that point (single mock-server instance, which comfortably covers MVP and early V1 traffic), introducing Redis buys nothing — an in-process `EventEmitter` fans out to connected SSE clients on the same instance just fine. This is the concrete answer to "explain where Redis would or would not be justified": it is not a general caching layer for this product's read patterns (workspace/endpoint lookups are already single, indexed-PK-fast Postgres queries — adding a cache in front of that trades complexity for a marginal win), it is specifically the fan-out mechanism for multi-instance real-time streaming, introduced exactly when the mock server stops being a single process.

---

## 18. PostgreSQL vs MongoDB Decision

| Requirement | PostgreSQL | MongoDB |
|---|---|---|
| Event log (append-only, ordered) | Strong — sequential PK/index, `BigInt` sequence column, cheap range queries | Workable, but ordering guarantees across a sharded/replicated cluster are weaker than a single relational sequence without extra design |
| Branching (parent/child scenario relationships, foreign keys to enforce integrity) | Strong — native FK constraints keep `Scenario.parentId`, `TimelineEvent.parentEventId` always valid | Requires application-level integrity checks; no native FK enforcement |
| JSON-heavy endpoint definitions (headers, body, rule conditions) | Strong — `jsonb` gives schema-flexibility *and* indexability (GIN indexes) where needed, without giving up relational guarantees elsewhere | Native strength, but this product needs JSON flexibility for a *minority* of fields, not the whole model |
| Transactions (e.g., branch creation must atomically create a scenario + copy N endpoints) | Strong — multi-document/multi-table ACID transactions are first-class | Multi-document transactions exist but are a bolted-on capability, historically less battle-tested for this kind of multi-collection consistency |
| Collaboration (future multi-user edits, need for row-level locking/consistency) | Strong — mature row-level locking, well-understood concurrency model | Workable, less mature tooling for this specific pattern |
| Query flexibility (filter logs by status/method/date, aggregate timeline stats) | Strong — SQL joins/aggregates are exactly this workload | Workable via aggregation pipeline, more verbose for relational-shaped questions |
| Prisma support | Best-supported target ORM-wise (migrations, relations, `jsonb` mapping all mature) | Supported, but historically the secondary/less mature Prisma target with more rough edges (no native migrations in the same sense) |
| Future scaling | Vertical scaling + read replicas comfortably cover this product's realistic trajectory; sharding exists if ever needed | Easier horizontal sharding, but this product's data isn't naturally partition-friendly (workspaces are small, relationships matter more than raw write throughput) |

**Recommendation: PostgreSQL.**

The deciding factors are the two rows that matter most for *this specific product*: **branching integrity** (parent/child relationships between scenarios and events are exactly what foreign keys and relational constraints are for — losing that would mean re-implementing referential integrity by hand) and **transactional consistency for branch creation** (forking must atomically create a scenario and copy its endpoint set — a partial fork is a corrupted branch). MongoDB's document flexibility would help with rule/response JSON, but Postgres's `jsonb` columns already give that flexibility on the specific fields that need it (`Endpoint.responseBody`, `EndpointRule.conditions`) without sacrificing relational integrity everywhere else. This isn't "Postgres because it's popular" — it's Postgres because the product's core differentiator (a parent/child scenario tree with atomic forking) is a relational-integrity problem first and a document-flexibility problem second.

---

## 19. Infrastructure Architecture

**Start simple (MVP):**

```text
Vercel or single container host  →  Next.js (apps/web)
Single container (Fly.io/Render/ECS)  →  Node server (apps/server, both API + mock routes)
Managed Postgres (RDS/Neon/Supabase)
S3 (snapshots, exports)
```

- **Docker Compose** covers local dev only in MVP (Postgres + the Node server) — no need to containerize the Next.js dev server locally.
- **Environment variables** via a validated schema (zod) loaded at boot, failing fast on missing/malformed config rather than surfacing errors deep in a request handler.
- **Migrations** via `prisma migrate deploy` as an explicit CI/CD step before the new server version starts serving traffic — never `prisma db push` in any non-local environment.
- **Logging** — structured JSON logs (pino) to stdout, shipped to whatever the host provides natively (CloudWatch/Render logs) rather than standing up a logging stack in MVP.
- **Metrics/monitoring** — MVP: host-provided basics (CPU/memory/request count) plus a handful of custom counters (mock requests served, rule evaluation errors) exported via a simple `/metrics` endpoint; a full Prometheus/Grafana stack is post-MVP infrastructure, not justified by MVP's traffic.
- **Backups** — rely on managed Postgres's automated backups (point-in-time recovery) rather than building custom backup tooling; S3 objects are already durable by default.
- **Deployment** — a single CI pipeline: test → build → migrate → deploy, no blue/green or canary complexity until there's real concurrent traffic to protect against.
- **Scaling** — MVP runs the App API and Mock server as **one process** (§2); the first scaling move (V1/post-V1, once mock traffic volume actually warrants it) is splitting them into two deployable services sharing the same DB, so mock-server traffic spikes don't affect editor API responsiveness and vice versa — at that point the mock server becomes the horizontally-scaled piece (stateless, scales out behind a load balancer) while the control-plane API stays a smaller fleet.

---

## 20. AWS Architecture

### Required for MVP
- **S3** — one bucket, prefixed by workspace ID, for snapshots/exports. Server-side encryption enabled by default; bucket is fully private, accessed only via the server's IAM role (never presigned public URLs to arbitrary objects without an expiry).
- **RDS (Postgres)** — single instance, `db.t3.small`-class to start; automated backups on.
- **Compute** — a single ECS/Fargate service (or equivalent single-container host if avoiding AWS lock-in early) running `apps/server`.
- **Secrets management** — AWS Secrets Manager (or even just ECS task-definition environment variables sourced from Secrets Manager) for DB credentials and any signing secrets — never baked into the image or committed.

### Add later
- **CloudFront** — once `apps/web` needs edge caching/global distribution beyond what Vercel-style hosting already gives for free; not needed if using Vercel for the frontend.
- **Load balancer (ALB)** — once the mock server splits into its own horizontally-scaled service (§19) with more than one task.
- **Separate ECS service for the mock server** — the concrete point where "MVP infra" becomes "V1+ infra": split compute so mock-traffic scaling doesn't require scaling the control-plane API.
- **ElastiCache (Redis)** — only once real-time streaming needs multi-instance pub/sub (§17) — do not provision this alongside MVP infrastructure.
- **RDS read replica** — only once read traffic (timeline queries, log queries) on the primary is demonstrably contending with write traffic (mock requests, endpoint edits) — not a day-one provisioning decision.

Avoided entirely at this stage: multi-region, WAF beyond basic rate limiting, VPC peering complexity beyond a standard private-subnet-for-DB setup — all premature for a product validating product-market fit.

---

## 21. GitHub Versioning Architecture

**Not MVP scope.** Introduce this once workspaces are complex/valuable enough that users want them under source control alongside their application code — realistically, once team workspaces (V1 auth) exist, since "GitHub-based versioning" implies an organization with a repo, not an anonymous demo workspace.

**Serialization format:**

```text
workspace.json          # workspace metadata, active scenario pointer
endpoints/
  main/
    get-users.json
    post-orders.json
  payment-success/
    get-users.json       # overrides for this scenario, only if it differs from main
scenarios.json           # scenario tree metadata (names, parent relationships)
```

Each endpoint serializes to a flat, human-diffable JSON file (method/path/response/rules) — deliberately **not** a serialization of `TimelineEvent` rows. This is the key design decision: **Git versions configuration state, the internal timeline versions request/execution history** — these are different axes and conflating them (trying to make Git branches *be* the timeline/event log) would mean reimplementing the entire branching/event system on top of Git internals, which is both redundant and a poor fit (Git isn't built for high-frequency, request-level event appends).

**Import/export:** `WorkspaceVersion` (§3) already models "a labeled, point-in-time export to S3" — GitHub integration is an additional *trigger* for creating a `WorkspaceVersion` (on commit/push) and a *source* for creating one (on pull, import into a fresh scenario), not a new storage mechanism.

**Schema migrations:** the exported JSON format is versioned (`"schemaVersion": 2`) so older exports can still be imported by running them through migration functions, the same pattern as a DB migration but applied to the export format specifically.

**Git branches / commits:** a natural mapping exists (Tramus scenario ↔ Git branch) but should be **opt-in and one-directional to start** (export workspace state to a branch/commit on demand) rather than a live bidirectional sync — bidirectional sync raises real merge-conflict questions (what does it mean for a Git merge conflict to occur inside `get-users.json`?) that are worth deferring until there's a concrete user need driving the design, rather than solving speculatively.

**Merge conflicts:** when they do arise (V2+ bidirectional sync), resolve at the file level using Git's own merge machinery (the JSON files are plain text, so Git's line-based diff/merge already mostly works) rather than building a custom semantic merge tool — only escalate to something smarter if line-based JSON merges prove too noisy in practice.

---

## 22. Technical Decisions Log

| Decision | Options | Recommendation | Why | Revisit when |
|---|---|---|---|---|
| Database | PostgreSQL, MongoDB | PostgreSQL | Branching/forking is a relational-integrity problem; `jsonb` covers the flexible-schema needs (§18) | Never, realistically, for this data shape |
| REST vs GraphQL implementation order | REST first, GraphQL first, both together | REST first | Route matching + rule engine are simpler to get right for REST; GraphQL mocking is schema-aware and a genuinely different problem (§0) | Once REST mocking is stable and users ask for GraphQL |
| WebSockets vs SSE | WebSockets, SSE, polling | Polling in MVP, SSE in V1 | Bidirectional isn't needed (server→client only); SSE is simpler infra than WS and fine over HTTP/2 | If client→server real-time push is ever needed (unlikely for this product) |
| Event sourcing vs snapshots | Events-only, snapshots-only, events+snapshots | Events as source of truth, snapshots as derived cache | Snapshots-only can't answer "why"/support the waterfall UI; events-only is correct but needs a perf assist for long scenarios (§4/§5) | If `getStateAt` latency becomes a measured problem |
| Server-authoritative vs collaborative state | Server-authoritative, OT, CRDT | Server-authoritative (last-write-wins with version check) | Multi-user concurrent editing isn't in MVP or early V1; CRDT/OT complexity isn't earned yet (§23) | Once team workspaces show real concurrent-edit conflicts in practice |
| Redis or no Redis | Redis everywhere, no Redis, Redis for streaming only | Redis introduced only for multi-instance real-time fan-out | Every other read pattern is already fast, indexed Postgres; Redis elsewhere is unjustified complexity (§17) | Once mock server is horizontally scaled *and* real-time streaming ships |
| Anonymous sharing architecture | Bearer share-tokens, magic-link auth, no anonymous access | Bearer share-tokens (VIEW/USE/EDIT) + owner-secret cookie | Matches the "no account required" MVP constraint while keeping ownership distinguishable from share access (§9) | Once real accounts exist — convert tokens to single-use invites |
| Route matching library vs custom | `path-to-regexp`, custom matcher | `path-to-regexp` | Solved problem, well-tested edge cases, same library Express uses (§6) | Only if GraphQL/gRPC adapters need a fundamentally different matching model (they would, but as separate adapters, not a `path-to-regexp` replacement) |
| State management (frontend) | Redux/Zustand, React Query + local state | React Query + URL state + local state | No cross-cutting client-only state exists yet that would justify a global store (§10) | If genuinely global, non-server client state emerges (e.g., a complex multi-step wizard spanning routes) |
| API validation library | zod, io-ts, manual | zod | Ergonomic, shared between client/server via `packages/validation`, strong TS inference | Unlikely to need revisiting |
| Authentication strategy | Owner-secret cookie (MVP) → real accounts (V1) | Staged: cookie-based anonymous ownership, then email/OAuth accounts | Matches "no account required" MVP constraint without painting into a corner for V1 collaboration (§9) | At V1 kickoff, by design |

---

## 23. Risks and Failure Modes

| Risk | Likelihood | Impact | Mitigation | Early warning sign |
|---|---|---|---|---|
| Overengineering the timeline system before MVP validates the core mock server | Medium-High | High — could sink weeks before any user has confirmed the boring mock server is even useful | Strict phase ordering (§12/§13): timeline/branching is explicitly Phase 6–7, after a shippable MVP | Catching yourself designing `diffScenarios` before Phase 3 (mock server) is done |
| Branching complexity creeping beyond what §4's model supports cleanly (e.g., wanting cross-branch cherry-picking) | Medium | Medium | Keep the model to "scenario = linear event chain, fork = new chain + endpoint copy" (§4); treat requests for more exotic Git-like operations (rebase, cherry-pick) as explicitly out of scope until real demand | A feature request that needs event *reordering* or *merging*, not just forking |
| Expensive state reconstruction on long-lived scenarios | Low in MVP, rising over time | Medium | Snapshot-every-N-events (§5), introduced only once measured, not preemptively | `getStateAt` p95 latency climbing on the timeline page |
| Timeline rendering performance at scale | Low-Medium | Medium | Virtualization + windowed queries from the start of Phase 6 (§11), not retrofitted | Dev-tools showing >500 DOM nodes on the timeline page |
| Public mock-server abuse (scraping, flooding, guessed workspace IDs) | Medium (it's the whole point of the product to be publicly callable) | Medium-High | Rate limiting, no enumeration endpoint, side-effect-free mock responses (§9/§16) | Spike in request volume from a small set of source IPs against many different workspace IDs |
| Collaborative editing complexity introduced too early | Low if roadmap is followed | High if it happens | Explicitly deferred past V1 accounts (§22); server-authoritative last-write-wins until real conflict data exists | A feature request for "live cursors" or "see teammate's edits in real time" before basic accounts even ship |
| Schema migration pain (retrofitting branching onto a non-scenario-scoped Endpoint model) | Low — mitigated architecturally | High if it were to happen | `Endpoint.scenarioId` designed in from Phase 2, not retrofitted (§3/§4) — this is the single highest-leverage early decision in the whole plan | N/A — this is a decision already made correctly in this design; the warning sign would have been building `Endpoint` as workspace-scoped only |
| Unclear distinction between workspace state (`Endpoint`) and request history (`TimelineEvent`/`RequestLog`) leaking into the product's UX or API design | Medium | Medium | Keep the three tables (`Endpoint`, `TimelineEvent`, `RequestLog`) conceptually and physically separate, each with a single clear job (§3/§4/§6) | An API endpoint or UI view that has to "figure out" current config by replaying events instead of reading `Endpoint` directly |

---

## 24. Architecture Evolution

**Stage 1 — MVP:** Next.js, single Node process (API + mock combined), Postgres, S3. Anonymous workspaces.

**Stage 2 — Timeline + branching:** add `TimelineEvent`/`Snapshot`, `getStateAt`, `branchFrom`, `replayScenario`. No infra changes — same single process, same DB.

**Stage 3 — Real-time events:** SSE for live log/timeline updates. Still single mock-server instance; no Redis yet.

**Stage 4 — Team collaboration:** real accounts, `WorkspaceMember`, share links become invites. Likely the point where mock server splits into its own service (traffic patterns diverge from editor API traffic) and Redis pub/sub is introduced for multi-instance SSE fan-out.

**Stage 5 — GitHub integration:** export/import to a repo format (§21), opt-in, one-directional initially.

**Stage 6 — Large-scale infrastructure:** horizontally-scaled mock-server fleet behind a load balancer, RDS read replicas for timeline/log query load, possibly a dedicated queue (SQS or similar) for timeline-event writes if fire-and-forget in-process emission stops being sufficient at real volume.

**What stays stable across all six stages:** the `Endpoint`-is-scenario-scoped schema decision (§3/§4), the events-are-source-of-truth/snapshots-are-derived principle (§4), the declarative no-code-execution rule engine (§7), and the mock server's read-only relationship to configuration data (§16). These are the decisions worth getting right once because reversing any of them later means a real migration, not a config change.

**What's expected to change:** process topology (one service → two → a scaled fleet), the presence/absence of Redis, the presence/absence of a message queue, and the auth model (cookie → accounts) — all of these are designed as additive changes on top of the stable core, not replacements of it.

---

## 25. Stretch Goals

**Browser extension (traffic capture → auto-generated endpoints):**
- Architecture: a MV3 extension using the `webRequest`/`declarativeNetRequest` APIs to observe real API calls made by a page the user is actively developing against, converting captured `(method, path, response)` tuples into draft `Endpoint` creation payloads sent to the Tramus API.
- Privacy: capture must be opt-in per site (not always-on), request/response bodies should be redacted or user-reviewed before being sent to Tramus's servers (auth tokens, PII in bodies are a real leak risk), and the extension should default to capturing *shape* (status, headers, JSON structure) rather than raw values, letting the user choose to include real data.
- CORS: irrelevant to capture itself (the extension observes traffic the page already made), but matters once the *mock* endpoint is called from the page instead — the mock server needs permissive-but-explicit CORS handling (echo the request's `Origin` rather than a wildcard, since credentials may be involved) so captured-and-replayed endpoints work in the browser without extra config.
- Converting requests into endpoint definitions: infer path params by diffing multiple captured calls to structurally similar paths (`/users/1`, `/users/2` → `/users/:id`) rather than requiring the user to hand-edit every captured route.

**gRPC support:** kept out of the core by design — `mock-engine`'s `resolve(endpoints, request) -> response` interface (§2) is transport-agnostic; a gRPC adapter would translate protobuf-defined service calls into the same internal `MockRequest` shape (mapping RPC method → a synthetic "path," message fields → the same field-access namespace the rule engine already understands) rather than requiring a parallel rule/response engine. The real work is a protobuf-schema-aware editor UI, not the routing/rule core.

**Playwright integration:**
```text
test
  → select scenario (call POST /workspaces/:id/scenarios/:id/activate, or point the test's
    mock URL directly at a specific scenario via a pinned share-link-style URL)
  → run test, app under test calls the mock server as normal
  → advance/replay mock state (test can POST to create new endpoints/rules mid-test,
    or trigger a scenario switch to simulate a state transition like "payment now fails")
```
This is achievable with the existing control-plane API as-is (a thin `@tramus/playwright` package wrapping API calls in test-friendly helpers) — no core architecture changes needed, which is a good sign the API design in §8 is at the right level of abstraction.

---

## 26. Example End-to-End User Flow

```text
1. User creates workspace
   → POST /workspaces → Workspace + root Scenario("main") rows created, owner-secret cookie set

2. Creates GET /users
   → POST /workspaces/:id/endpoints → Endpoint row created, scenarioId = main's id

3. Adds JSON response
   → same request includes responseBody; stored as jsonb on the Endpoint row

4. Gets mock URL
   → frontend computes https://mock.tramus.dev/<workspaceId>/users from the created endpoint

5. Frontend (or the user's own app) calls the mock URL
   → mock server: workspace resolver loads Workspace + active Scenario,
     route matcher finds the Endpoint by (method, path), no rules configured
     → default responseBody returned as-is

6. Server returns JSON
   → 200, configured body, configured headers

7. Request is logged
   → RequestLog row inserted synchronously (§6)

8. Timeline event is stored (V1+)
   → TimelineEvent(type=REQUEST, scenarioId=main, sequence=N) appended asynchronously

9. User changes response
   → PATCH /workspaces/:id/endpoints/:id → Endpoint row updated;
     TimelineEvent(type=ENDPOINT_CHANGE) appended, capturing before/after

10. User rewinds to previous state
    → GET /workspaces/:id/timeline/:eventId/state → getStateAt() replays events
      up to that point, returns the old Endpoint shape (read-only preview, doesn't
      mutate the live Endpoint row)

11. User creates a new scenario from that point
    → POST /workspaces/:id/scenarios {forkFromScenarioId: main, forkAtEventId: <that event>}
      → branchFrom(): new Scenario row, Endpoint rows copied as they existed at that event
        (i.e., the OLD response, since that's what state existed at the fork point)

12. User modifies the endpoint in the branch
    → PATCH against the fork's Endpoint row (different id, same path/method, scenarioId = fork)
      → fork's own TimelineEvent chain gets an ENDPOINT_CHANGE event; main's chain is untouched

13. Frontend calls the same mock URL, scoped to the fork
    → mock URL for a specific scenario: either the workspace's "active scenario" is switched
      to the fork in the UI (affecting the default mockUrl), or a scenario-pinned share link
      is used (§9) — either way, the mock server's scenario resolver now returns the fork's
      Endpoint row instead of main's

14. Different response is returned
    → the fork's edited responseBody, proving main and the fork have diverged independently,
      with both fully reconstructable and comparable via diffScenarios() (§5)
```

Every step maps to a concrete table write or read described earlier in this document — there's no hand-waved step in this flow.

---

## 27. First 10 Engineering Tasks

**1. Initialize Turborepo monorepo skeleton**
Goal: `apps/web`, `apps/server`, `packages/config` exist and `turbo build` succeeds on empty scaffolds.
Files: repo root, `turbo.json`, `pnpm-workspace.yaml`.
Notes: pin Node/pnpm versions in `package.json#engines`; add a root `.eslintrc` extended by all packages.
Acceptance: fresh clone → `pnpm install && pnpm turbo build` succeeds with no errors.

**2. Set up Docker Compose for local Postgres**
Goal: one-command local DB.
Files: `docker-compose.yml`, `.env.example`.
Notes: pin the Postgres major version to match the target managed-DB provider.
Acceptance: `docker compose up -d` gives a reachable Postgres on the documented port.

**3. Initialize `packages/db` with the MVP Prisma schema**
Goal: `Workspace`, `Scenario`, `Endpoint` models exist and migrate cleanly.
Files: `packages/db/schema.prisma`, first migration.
Notes: include `scenarioId` on `Endpoint` from this first migration (§4) — do not defer.
Acceptance: `prisma migrate dev` succeeds against the Compose DB; generated client importable from `apps/server`.

**4. Scaffold `apps/server` with a health-check route**
Goal: a running Node server with `/health` returning 200.
Files: `apps/server/src/index.ts`.
Notes: use Fastify (lighter, faster JSON handling than Express, matters for the mock-server hot path) unless the team has a strong existing Express preference.
Acceptance: `curl localhost:PORT/health` returns 200 locally and in CI.

**5. Build `POST /workspaces` and owner-secret cookie issuance**
Goal: creating a workspace persists it and returns an ownership cookie.
Files: `apps/server/src/api/workspaces.ts`.
Notes: auto-create the root `Scenario("main", isRoot: true)` in the same transaction as the `Workspace` insert.
Acceptance: creating a workspace twice from two different clients yields two independently-owned workspaces; a client without the cookie cannot PATCH someone else's.

**6. Build Endpoint CRUD (control-plane)**
Goal: full create/list/update/delete for endpoints, scenario-scoped.
Files: `apps/server/src/api/endpoints.ts`, `packages/validation/endpoint.ts`.
Notes: enforce the `(scenarioId, method, path)` uniqueness constraint with a friendly 409, not a raw DB error leaking through.
Acceptance: integration test covering create/list/update/delete plus the uniqueness-conflict case.

**7. Build `packages/mock-engine` route matcher (pure, unit-tested)**
Goal: `resolve(endpoints, request) -> response | null`, zero I/O.
Files: `packages/mock-engine/src/match.ts`, `packages/mock-engine/src/resolve.ts`.
Notes: use `path-to-regexp`; implement route-priority sorting (static > param > wildcard) as described in §6.
Acceptance: unit tests covering param extraction, method mismatch, priority ordering, no-match case.

**8. Wire the mock server route tree into `apps/server`**
Goal: real HTTP requests to `/<workspaceId>/*` resolve via `mock-engine` against real DB-backed endpoints.
Files: `apps/server/src/mock/index.ts`.
Notes: this is the workspace + scenario resolver step (§6) — keep it a thin adapter calling into `mock-engine`, not new matching logic.
Acceptance: end-to-end test — seed a workspace/endpoint, `curl` the mock URL, assert the configured response.

**9. Scaffold `apps/web` with workspace creation + endpoint list/editor**
Goal: minimal but functional UI covering tasks 5–6.
Files: `apps/web/app/w/[workspaceId]/page.tsx`, `apps/web/hooks/useEndpoints.ts`.
Notes: react-query for all server state (§10) from the start, don't prototype with raw `useEffect` fetches that'll need rewriting.
Acceptance: a user can create a workspace in the browser, add an endpoint, and see it listed.

**10. Surface the mock URL in the UI and add `RequestLog` writes**
Goal: close the loop — user can see the URL, call it, and see it logged.
Files: `apps/server/src/mock/index.ts` (log write), `apps/web/components/endpoint-editor/MockUrlBadge.tsx`.
Notes: log write happens synchronously post-response (§6), not blocking the response itself.
Acceptance: calling a mock endpoint via `curl` produces a visible row in a (even minimal, unstyled) log view within the app.

---

## 28. Suggested GitHub Issue Breakdown

```text
epic: foundation
  - Initialize Turborepo + pnpm workspace
  - Docker Compose local Postgres
  - Shared TS/ESLint config package
  - CI pipeline: lint, test, build

epic: workspace
  - Workspace model + migration
  - POST/GET/PATCH /workspaces
  - Owner-secret cookie auth
  - Root scenario auto-creation

epic: endpoint mocking
  - Endpoint model + migration (scenario-scoped)
  - Endpoint CRUD API
  - mock-engine: route matcher (pure)
  - mock-engine: response resolver (pure)
  - Mock server route tree wiring
  - Endpoint editor UI
  - Mock URL display + copy button

epic: sharing
  - ShareLink model + migration
  - Share link issuance API
  - /share/:token resolver page
  - VIEW/USE/EDIT permission enforcement middleware
  - Rate limiting on mock server routes

epic: request logging
  - RequestLog model + migration
  - Log write on mock request
  - Logs API (filter/sort/paginate)
  - Log table UI

epic: timeline
  - TimelineEvent model + migration
  - REQUEST/ENDPOINT_CHANGE event emission
  - getStateAt implementation + unit tests
  - Read-only timeline UI (waterfall, no branching yet)
  - Timeline UI virtualization

epic: branching
  - Scenario.parentId/forkedAtEventId support
  - branchFrom implementation
  - replayScenario implementation
  - Fork UI (from timeline event)
  - Scenario switcher UI
  - diffScenarios (endpoint diff + side-by-side logs)

epic: rules
  - EndpointRule model + migration
  - Condition tree evaluator (packages/mock-engine)
  - Rule editor UI
  - Regex safety validation on save
  - Latency/error simulation config + implementation

epic: collaboration
  - User + WorkspaceMember models
  - Auth (email/OAuth)
  - Convert share tokens to invite flow
  - Role-based permission checks (OWNER/EDITOR/VIEWER)

epic: OpenAPI
  - OpenAPI 3.0 export from Endpoint model
  - Export API endpoint + UI download button

epic: GitHub integration
  - workspace.json export/import format + schema versioning
  - WorkspaceVersion model + S3 storage
  - Manual "export to repo" flow
  - Manual "import from repo" flow
```

---

## 29. Definition of Done (MVP)

```text
[ ] User can create a workspace without an account
[ ] Workspace ownership persists across sessions via a secure cookie
[ ] User can create an endpoint with method, path, status, headers, and JSON body
[ ] User can edit and delete an existing endpoint
[ ] A generated mock URL is shown for each endpoint
[ ] Calling the mock URL over plain HTTPS returns exactly the configured response
[ ] Calling an undefined route on a workspace returns a clear 404, not a server error
[ ] Requests to the mock server are recorded and visible in a log view within 5s
[ ] Log entries include method, path, status, duration, and timestamp
[ ] Log entries are filterable by status code and method
[ ] User can generate a VIEW share link and a logged-out browser can open it read-only
[ ] User can generate a USE share link that exposes only the mock URL, not the editor
[ ] Revoking a share link immediately invalidates it (next request rejected)
[ ] Mock server enforces a per-workspace rate limit and returns 429 when exceeded
[ ] Request/response bodies over the configured size cap are rejected with a clear error
[ ] All of the above is covered by at least one integration test per bullet
[ ] `turbo build lint test` passes in CI on a clean checkout
[ ] The full stack deploys via the documented pipeline to a real (non-local) environment
```

This list is intentionally testable, not aspirational — every line is either a pass/fail integration test or a manually-verifiable checklist item, not a subjective quality bar.

---

## 30. Final Recommended Architecture

**Frontend:** Next.js (App Router), React Query for server state, URL search params for shareable view state, Framer Motion for the timeline, no global client store.

**Backend:** Node.js, single deployable service in MVP with two route trees (control-plane API, data-plane mock server); `mock-engine` and `timeline` as pure, dependency-free packages underneath.

**Database:** PostgreSQL via Prisma — chosen specifically for relational integrity on the scenario/event parent-child model and atomic multi-row transactions on branch creation (§18).

**Object storage:** AWS S3 — workspace snapshots, OpenAPI exports, GitHub-sync artifacts. Never a source of truth for queryable data.

**Realtime:** none in MVP (poll); SSE in V1; Redis pub/sub introduced only once the mock server is horizontally scaled across multiple instances (§17).

**Timeline model:** append-only `TimelineEvent` rows, one linear chain per `Scenario`, forks recorded as a single parent-event pointer on the child scenario's first event — events are the source of truth, snapshots are a derived, rebuildable performance cache (§4).

**Branching model:** `Endpoint` rows are scenario-scoped from day one (§3/§4), so forking is an O(endpoint-count) copy operation, not an O(event-count) replay — this single decision is what keeps branching cheap and is why it doesn't require a schema migration to introduce in V1.

**Deployment:** managed Postgres + S3 + a single containerized Node service to start (§19/§20); split into a scaled mock-server fleet + smaller control-plane API only once traffic patterns justify it.

**Authentication:** anonymous owner-secret cookie + bearer share tokens in MVP, evolving into real accounts with `WorkspaceMember` roles in V1, with share tokens becoming single-use invitations rather than standing bearer credentials at that point (§9).

**MVP scope:** create endpoints → define static JSON responses → get a shareable, rate-limited mock server URL → see requests in a log. No timeline, no branching, no rules, no accounts.

**V1 scope:** read-only then interactive timeline, scenario branching and replay, the declarative rule engine, latency/error simulation, real accounts and team workspaces, real-time log streaming.

The single idea worth protecting throughout every stage of this roadmap: **the mock server's hot path never depends on the timeline/branching system**, and **the timeline/branching system's correctness never depends on anything other than the append-only event log**. Keeping those two facts true is what lets "Git for network state" be built incrementally on top of a boring, fast, reliable mock server — rather than requiring the hard, differentiating idea to work perfectly before anything ships.
