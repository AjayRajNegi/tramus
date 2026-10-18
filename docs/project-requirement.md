# Tramus: Project Requirements

*Version 1.0 · Audience: coding agents and engineers · Status: requirements baseline · Requirements only; architecture and ADRs follow separately*

## 1. Purpose and scope

This document defines **what Tramus must do and the constraints it must meet**. It is the single source of truth for product requirements.

- It deliberately excludes architecture, ADRs, data model, API design and component design. Those are written separately. Until then, nobody should infer them from this document.
- **MUST / SHOULD / MAY** follow RFC 2119. Each requirement has an ID (for example `FR-TL-3`) so tasks, tests and commits can reference it.
- **\[OPEN\]** marks an unresolved question with a default to use meanwhile (section 13).
- Coding agents: implement only the current phase (section 10). A requirement is done only when its acceptance criteria pass in automated tests. If behavior is not stated here, raise it as an open question instead of inventing it.

## 2. Problem and product

### 2.1 Problem

API testing tools such as Postman and Insomnia feel slow and heavy. Their desktop apps are large and often feel unnecessary to install. They also give no structure to how endpoints relate: requests pile up on top of each other with no way to see where each one belongs in the flow.

### 2.2 Product

Tramus is a lightweight **web app**, plus a **browser extension** for local endpoint testing. Users define mock endpoints, send requests, and watch them on a visual network timeline. The timeline behaves like version control for API and network state: rewind to any point, fork an alternate scenario from it (like a git branch or worktree), change mock behavior in the fork, replay the same requests, and compare results.

**Timeline branching and scenarios are the main differentiator and get the most product and engineering attention.**

### 2.3 Product goal

Build an endpoint-testing web interface and a companion web extension for local endpoint testing. The web interface has four pillars: timeline branching, a mock server, shareable URLs and an endpoint editor.

## 3. Users and core journey

**Target user:** small developers and small teams who want a tool that feels quick, is customizable, is not bloated, runs in a browser tab, and needs no account.

A user MUST be able to complete this journey end to end:

1. Define API endpoints.
2. Execute requests against the mock server.
3. See those requests on a visual network timeline.
4. Rewind to a previous network state.
5. Fork that state into an alternate scenario.
6. Modify mock behavior in the fork.
7. Replay requests against the alternate scenario.
8. Compare scenarios.
9. Share a workspace or scenario through a URL.
10. Inspect request history and the network waterfall.

Example of the intended model:

```text
main
 |-- request A
 |-- request B
 |-- request C
 |
 |-- scenario: payment-success
 |     |-- request D
 |     |-- request E
 |
 |-- scenario: payment-failure
       |-- request D
       |-- request E
```

## 4. Product principles

1. **Fast by default.** The tool must feel instant; speed budgets are in section 8.
2. **Minimal.** Few screens, keyboard-first, nothing that distracts from the task. Heavy features load only when needed.
3. **Customizable.** Users shape endpoints, rules, behavior and scenarios to their own needs.
4. **Deterministic.** The same configuration, request and seed give the same response, latency and failure outcome.
5. **History is never destroyed.** Rewind and fork never delete anything.
6. **Secure by default.** Convenience never overrides security (section 8.2).
7. **Protocol-ready.** REST first, but nothing REST-specific may leak into the timeline, scenarios, sharing or logging.

## 5. Glossary

| Term | Meaning |
| --- | --- |
| Workspace | Top-level container for endpoints, scenarios and history. |
| Endpoint | A mock endpoint definition: method, path, responses, rules, behavior. |
| Scenario | A named branch of the workspace with its own configuration changes and request history. `main` is the default. |
| Timeline event | An immutable, ordered record in a scenario: a configuration change or an executed request. |
| Rewind | Viewing the workspace as it was at an earlier event. Never destructive. |
| Fork | Creating a new scenario from a chosen event. |
| Replay | Re-sending recorded requests against a target scenario. |
| Snapshot | An immutable saved copy of a scenario at a moment in time, used for sharing. |
| Mock server | The part of Tramus that answers requests to defined endpoints. |

## 6. Mandated stack and platforms

These are decided. Everything else is left to the architecture phase.

| Area | Requirement |
| --- | --- |
| Monorepo | Turborepo |
| Frontend | Next.js; **motion** (Framer Motion) for timeline interaction and animation |
| Backend | Node.js |
| Database | PostgreSQL with Prisma |
| Storage | AWS S3 (workspace snapshots and large payloads) |
| Browser extension | WXT framework |
| Delivery | Web app first; no installable desktop app |

## 7. Functional requirements

### 7.1 Visual endpoint editor (FR-ED)

- **FR-ED-1** Users MUST be able to visually define: HTTP method, path (including path parameters), request headers, query parameters, request body, response status, response headers, JSON response body, endpoint behavior, and optional conditional rules.
- **FR-ED-2** An endpoint MUST support several named responses (for example `premium-response`, `standard-response`) with one marked as default.
- **FR-ED-3** Users MUST be able to create, duplicate, disable, delete, search and tag endpoints, with keyboard navigation.
- **FR-ED-4** Input MUST be validated inline. Invalid configuration cannot be saved. Duplicate method and path pairs are rejected; overlapping paths produce a warning and resolve by specificity (fixed segments beat parameters).
- **FR-ED-5** The editor MUST support undo and redo within a session.
- **FR-ED-6** REST MUST be supported first. The endpoint definition MUST be protocol-extensible so GraphQL can be added later without changing timeline, scenario, sharing or log behavior.
- **FR-ED-7** The endpoint definition MUST carry enough information to export OpenAPI 3.0 without rebuilding it (see FR-OA).

**Acceptance:** create an endpoint, save it, call it, receive the configured response.

### 7.2 Mock server (FR-MS)

- **FR-MS-1** Each scenario MUST be callable at a stable, unguessable URL.
- **FR-MS-2** Requests are matched by method and path template. Unmatched requests return a clear, structured 404 and are still logged.
- **FR-MS-3** CORS MUST be permissive by default (no credentials) with automatic preflight handling, and configurable per workspace.
- **FR-MS-4** Response bodies MAY use a small, fixed set of substitution tokens: request header, query value, path parameter, JSON body field, a generated unique ID, the current time, and a request counter. No expressions, helpers or loops in v1.
- **FR-MS-5** Content authored by users MUST NOT be able to run in the Tramus app origin or touch its cookies or storage. Mock responses carry protective headers (no content sniffing, sandboxing, no caching).
- **FR-MS-6** The mock URL key MUST be separate from any share link and rotatable by the owner.
- **FR-MS-7** Mock traffic MUST be rate limited per workspace (default in section 9).

### 7.3 Conditional response rules (FR-RL)

Support rules such as: IF `request.header['x-user-type'] == 'premium'` THEN return `premium-response`, ELSE return `standard-response`. And: IF `request.body.amount > 10000` THEN return 422.

- **FR-RL-1** A rule has a condition and an outcome (which response to return, optionally overriding latency or error behavior).
- **FR-RL-2** Conditions MUST be able to read: request header (case-insensitive), query parameter, path parameter, JSON body field, and method.
- **FR-RL-3** Operators MUST include: equals, not equals, greater than, greater or equal, less than, less or equal, in, not in, contains, starts with, ends with, matches pattern, exists, and type check. Conditions combine with all, any and not.
- **FR-RL-4** Rules are evaluated in order; the first match wins; no match returns the endpoint default.
- **FR-RL-5** **Safety:** the system MUST NOT execute user-provided code. No `eval`, no dynamic function construction, no user JavaScript. Rules are data interpreted by fixed logic.
- **FR-RL-6** Evaluation MUST be deterministic, side-effect free and always terminate. A missing value never causes an error; comparisons on it are false (except `exists` and `not`). There is no implicit type coercion.
- **FR-RL-7** Pattern matching MUST use a linear-time engine, so a hostile pattern cannot stall the server.
- **FR-RL-8** Rule size is bounded (limits in section 9).
- **FR-RL-9** The rule system MUST be extensible: new value sources and operators (for example GraphQL operation names) can be added without rewriting existing rules.
- **FR-RL-10** Rules are authored in a visual builder. A text syntax MAY follow later but compiles to the same rules. The UI MUST include a rule tester: paste a sample request, see which rule matched and why.

**Acceptance:** property-based tests show evaluation always terminates and never throws; evaluating a 10-rule endpoint takes under 50 microseconds at the median.

### 7.4 Latency and error simulation (FR-SIM)

- **FR-SIM-1** Users MUST be able to set fixed latency (for example 200ms), a latency range with random values (for example 100 to 1000ms), HTTP error responses, timeouts, and intermittent failures.
- **FR-SIM-2** Failures can be probabilistic (for example 10% chance of HTTP 500) or patterned (for example every 5th request fails).
- **FR-SIM-3** Latency order: choose response, apply latency, then apply faults. The first triggered fault wins.
- **FR-SIM-4** Randomness MUST be reproducible from a per-scenario seed so replays give identical latency and failure sequences.
- **FR-SIM-5** The realized latency and any fault applied MUST be recorded on the request event.
- **FR-SIM-6** Latency and timeout durations are capped (section 9).

**Acceptance:** with a fixed seed, repeated replays produce an identical sequence; over 10,000 requests the observed failure rate matches the configured probability within statistical tolerance.

### 7.5 Timeline and scenario branching (FR-TL)

The most important feature. Conceptually this is version control for API and network state.

- **FR-TL-1** Every workspace starts with a `main` scenario.
- **FR-TL-2** Every configuration change and every request is recorded as an ordered, immutable event in the active scenario.
- **FR-TL-3** Every request event MUST record the exact endpoint configuration in effect when it ran, so the state at the time of any request can be shown at any later point.
- **FR-TL-4** History is append-only. Rewind, fork and replay never delete or alter existing events.
- **FR-TL-5 Rewind:** selecting any event shows the workspace as it was then. This view is read-only until the user forks from it or returns to the latest state.
- **FR-TL-6 Fork:** from any event, the user creates a named scenario that starts with the state at that event and inherits history up to it. Later changes in either scenario are independent. Forking MUST be fast regardless of history size (under 1 second for 5,000 events) and MUST NOT duplicate history.
- **FR-TL-7** Users MUST be able to modify endpoint behavior in a fork without affecting its parent or siblings.
- **FR-TL-8 Replay:** the user can select one request, a range, or all requests from any visible scenario and re-send them, in original order, against the current state of a target scenario. Results are recorded as new events linked to the originals.
- **FR-TL-9** The user can keep developing from a new branch: new requests and changes extend it normally.
- **FR-TL-10** Scenarios can be named, renamed and archived. Archived scenarios remain viewable.
- **FR-TL-11** Merging scenarios is out of scope for v1.

**Acceptance (end to end):** define `POST /payments`; send requests A, B, C; fork `payment-success` and `payment-failure` from C; change the failure branch to return 500; replay D and E in both; both branches show correct, distinct results and the shared history A to C is identical in both.

### 7.6 Network waterfall timeline UI (FR-WF)

- **FR-WF-1** Requests are shown as a visual timeline and waterfall. Each row shows: start time, duration, latency, status code, endpoint, ordering, and the scenario and state at the time of the request.
- **FR-WF-2** Scenarios are drawn as lanes like a git graph, with fork points visibly branching from the parent lane.
- **FR-WF-3** Selecting an event opens an inspector with request and response data, headers, body, errors, matched rule, simulated latency or fault, and the configuration in effect.
- **FR-WF-4** The user can scrub a playhead along the timeline, select events, rewind, fork here, and replay a selection.
- **FR-WF-5** Timeline interaction and animation use **motion** where it helps (for example branch creation, event insertion). Reduced-motion preferences MUST be respected.
- **FR-WF-6** The time axis can show real time or event order; event order is the default to avoid large empty gaps.
- **FR-WF-7** The timeline MUST stay smooth (60 fps scrolling) with 5,000 events and MUST be fully keyboard operable.

### 7.7 Request log (FR-LG)

- **FR-LG-1** Incoming mock requests are listed with: timestamp, method, path, status, duration, response size, scenario and request ID.
- **FR-LG-2** Users MUST be able to filter (method, status class, scenario, endpoint, time range), search (path, request ID) and sort by any column.
- **FR-LG-3** Phase 2: live streaming of requests into the UI with pause and resume.
- **FR-LG-4** The log and timeline are two views of the same history and MUST never disagree.

### 7.8 Scenario comparison (FR-CMP)

- **FR-CMP-1** The user can compare two scenarios and see: configuration differences per endpoint; for replayed request pairs, differences in status, body and latency; and summary statistics (status counts, median and 95th percentile latency, error rate).
- **FR-CMP-2** Comparison MAY force the same seed on both sides for like-for-like results.
- **FR-CMP-3** MVP ships configuration diff and a paired-response table. The full comparison UI is Phase 2.

### 7.9 Shareable workspace URLs (FR-SH)

- **FR-SH-1** A user can share a workspace or scenario through a URL. No account is required for the sender or the recipient.
- **FR-SH-2** The share URL carries one opaque, unguessable token and nothing else. It MUST NOT contain workspace IDs or snapshot IDs, and IDs are never treated as secrets.
- **FR-SH-3** Tokens MUST be at least 256 bits from a cryptographically secure source and stored only as a hash.
- **FR-SH-4** Two link kinds, always explicit in the UI: **snapshot link** (default, immutable view of a scenario at a moment in time) and **live link** (current state of a scenario).
- **FR-SH-5** Permissions: **view** (inspect), **use** (inspect, send requests, fork into own copy) and **edit**. Default is view.
- **FR-SH-6** Opening a link shows a read-only workspace with an **Open as my copy** action that creates a new, separately owned workspace. Recipients never change the original without an edit link.
- **FR-SH-7** Links support optional expiry and instant revocation. Revocation is enforced on every open.
- **FR-SH-8** Without accounts, ownership is proven by a long random owner token held by the creator's browser, with a downloadable recovery link.
- **FR-SH-9** Unknown, expired and revoked links look identical to the visitor. Link opening is rate limited. Tokens never appear in logs. Pages opened by link must not leak the token through referrers and must not be indexed by search engines.
- **FR-SH-10** Snapshots are stored in **AWS S3** in a private, encrypted bucket. People never receive permanent S3 URLs; access is checked first and any direct object access is time-limited (5 minutes at most).
- **FR-SH-11** Eventually: collaborative and team workspaces (Phase 3).

How each URL option is treated:

| Option | Decision |
| --- | --- |
| Workspace ID in URL | No. Identifier only, never authorization. |
| Snapshot ID in URL | No. Same reason. |
| Signed URLs | Only internally and briefly, for S3 object access. Never as the share link. |
| Public identifier | Used for display only; grants nothing. |
| Access token | Yes: the single token in the share URL. |
| Immutable scenario reference | Yes: via snapshot links. |

### 7.10 OpenAPI export (FR-OA)

- **FR-OA-1** Users can export configured REST endpoints as **OpenAPI 3.0** (JSON and YAML), for any scenario or any rewound state.
- **FR-OA-2** Export MUST be a direct mapping of the stored endpoint definitions: paths, parameters, request bodies and responses by status code with examples.
- **FR-OA-3** Where users supplied no schema, a schema MAY be inferred from examples and labeled as inferred.
- **FR-OA-4** Rules and behavior are excluded by default and MAY be exported as vendor extensions on request.
- **FR-OA-5** Every export MUST validate against an OpenAPI validator; golden-file tests cover it.

### 7.11 Browser extension (FR-EX)

Built with the **WXT** framework. Purpose: let the web app test local and private-network endpoints that a normal web page cannot reach (CORS, mixed content, private network restrictions) and record those requests on the timeline.

- **FR-EX-1** Targets: Chrome, Edge and Firefox, using Manifest V3.
- **FR-EX-2** The web app detects the extension, shows connection status, and sends requests through it when the target is local or blocked from the page.
- **FR-EX-3** Results appear on the timeline and in the request log, marked as coming from the extension, in the active scenario.
- **FR-EX-4** The extension MUST follow least privilege: it works on the Tramus app origin only; access to localhost is optional; any other origin requires explicit user approval, is remembered in a list the user can review, and can be revoked.
- **FR-EX-5** The extension MUST only send requests the user explicitly triggers in the app, MUST verify the page origin of every message, and MUST omit cookies and credentials by default.
- **FR-EX-6** Response size and timeout are capped (section 9).
- **FR-EX-7** The UI MUST explain known limits (for example headers browsers forbid extensions to set).
- **FR-EX-8** Replay of extension-origin requests works only while the extension is connected.

**Acceptance:** from the web app, send a request to a local server on localhost with no CORS configured and see it on the waterfall; revoking permission makes later requests fail with a clear message.

### 7.12 GitHub-based workspace versioning (FR-GH, deferred)

Not part of MVP. It is introduced in **Phase 4**, because it needs three things first: a stable, versioned workspace file format; file export and import of a workspace (Phase 2); and real user accounts (Phase 3).

When built, it MUST:

- Connect a repository through a GitHub App with repository-scoped permissions, not a broad personal token.
- Export and import workspace configuration, commit changes, map scenarios to branches (opt-in), and synchronize state.
- Sync configuration only. Request history never leaves Tramus.
- Show conflicts as a diff for the user to resolve and never merge automatically. Prefer opening a pull request over writing directly to the default branch.

## 8. Non-functional requirements

### 8.1 Performance

- Main app route under 200 KB of gzipped JavaScript; interactive in under 2 seconds on a mid-range laptop.
- Editor interactions respond in under 100 ms.
- Mock server overhead at the 95th percentile under 10 ms, not counting simulated latency.
- A timeline page of 200 events loads in under 100 ms with 100,000 stored events.
- Heavy components (such as code editors) load on demand.

### 8.2 Security

1. No user-provided code ever runs on Tramus servers.
2. User-authored response content is isolated from the app (FR-MS-5), including serving mock traffic from a different registrable domain than the app.
3. Tramus servers MUST NOT make outbound requests to user-supplied URLs. External and local requests go through the browser or the extension.
4. Secrets (share tokens, owner tokens, mock keys) come from a secure random source, are long enough to resist guessing (at least 96 bits, 256 for share and owner tokens), and are stored hashed where they authorize access.
5. Token checks use constant-time comparison; failures never reveal whether a token ever existed.
6. All public routes are rate limited; token opening and workspace creation have stricter limits.
7. All inputs have size and depth limits (section 9).
8. The app uses a strict content security policy and never renders user content as executable HTML; mock responses are shown as text or in a sandbox.
9. Secrets and tokens never appear in logs or error messages. Dependencies are audited in CI.
10. Security-relevant behavior (token handling, revocation, enumeration resistance) has dedicated automated tests.

### 8.3 Reliability and data

- A failure to record an event MUST NOT fail the mock response. Writes are retried.
- Anonymous workspaces expire after inactivity (section 9) and users are told so.
- Configuration changes are never lost on concurrent edits: stale saves are detected and the user is prompted.

### 8.4 Accessibility and compatibility

- WCAG 2.1 AA for the editor and inspector; the timeline works with the keyboard alone.
- Web app: latest two versions of Chrome, Edge, Firefox and Safari. Extension: Chrome, Edge, Firefox.

### 8.5 Observability and quality

- Structured logs with request IDs, plus traces and metrics for mock latency and write backlog.
- Test expectations: unit tests for the timeline, rule and simulation logic (90% coverage); property-based tests for rule safety; contract tests for every API and extension message; end-to-end tests of the journey in section 3; golden-file tests for OpenAPI; pull requests blocked on type check, lint, tests and bundle size.

## 9. Limits and defaults

| Limit | Default |
| --- | --- |
| Endpoints per workspace | 100 |
| Total workspace configuration size | 512 KB |
| Request body / response body | 1 MB each |
| Rules per endpoint | 20 |
| Conditions per rule / nesting depth | 50 / 5 |
| Pattern length in rules | 200 characters |
| Latency or timeout cap | 30 seconds |
| Scenarios per workspace | 20 |
| Retained request events per scenario | 5,000 (configuration changes are never pruned) |
| Snapshot size / snapshots per workspace | 10 MB / 50 |
| Mock rate limit per workspace | 50 requests per second, burst 100 |
| Extension response size / timeout | 10 MB / 30 seconds |
| Anonymous workspace expiry | 30 days of inactivity |

## 10. Release phases

**Phase 0: Foundation.** Monorepo, CI, the mandated stack running locally with one command, and a deployable skeleton. *Exit:* CI is green and a sample workspace can be saved and loaded.

**Phase 1: MVP (web only).** Endpoint editor (7.1); mock server (7.2); rules (7.3); simulation (7.4); timeline with select, scrub, rewind, fork and replay (7.5, 7.6); request log without streaming (7.7); basic comparison (7.8); anonymous workspaces; share links (7.9); OpenAPI export (7.10). *Exit:* the journey in section 3 and the acceptance example in 7.5 pass end to end, including sharing a snapshot link and opening it as a different user.

**Phase 2: Power features.** WXT extension (7.11); live request streaming; full comparison UI; workspace file export and import; optional private mock mode (key required to call a mock URL). *Exit:* extension acceptance in 7.11 passes on Chrome and Firefox.

**Phase 3: Accounts and teams.** Sign-in, team workspaces, roles, claiming anonymous workspaces, collaboration.

**Phase 4: Integrations.** GitHub versioning (7.12), GraphQL endpoints, optional text syntax for rules.

## 11. Success measures

- A new user sends a first successful mock request within 60 seconds of landing.
- The full journey in section 3 completes without documentation.
- Performance budgets in section 8.1 hold in CI.
- Zero known ways to run user code on servers or to guess a share link.

## 12. Non-goals

- Not a full Postman replacement: no collection runner, scheduled monitors, scripting sandbox, gRPC or WebSocket in v1.
- No scenario merge in v1.
- No server-side forwarding of requests to user-supplied URLs.
- No GitHub sync, accounts or teams in the MVP.

## 13. Assumptions and open questions

**Assumptions**

- Replay is sequential and in original order; replay that preserves original gaps between requests can come later.
- Requests sent from the app UI and from outside tools are logged the same way, labeled by origin.

**\[OPEN\] items (default in brackets)**

1. Domains and hosting provider for Tramus \[any container host; no provider-specific features outside storage\].
2. Whether anonymous workspaces may hand out edit links \[yes, revocable by the owner\].
3. Whether the extension also records real browser tab traffic \[no; executor only until Phase 3\].
4. Sign-in method for Phase 3 \[decide in that phase\].
5. Retention numbers for account-based tiers \[decide in Phase 3\].
