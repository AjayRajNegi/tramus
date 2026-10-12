# Tramus Interceptor: Implementation Plan

*From an empty repo to a production-grade browser extension (and shared protocol package) that works with `apps/web`, based on the Tramus Browser Interceptor guide.*

## How to read this plan

The plan starts from the current state: there is **no** `apps/extension` and **no** `packages/protocol` yet. T-001 creates both. The last task ships the extension to the Chrome Web Store and documents the release process.

Assumptions that apply to every task:

- **Staging** means `apps/web` deployed to a staging origin, plus the extension zip built by CI and loaded unpacked by testers.
- **Tests** means unit tests for pure functions in each task, plus the manual checks listed. T-016 adds an automated end-to-end suite.
- **`@tramus/protocol`** is consumed as TypeScript source and bundled into the extension by WXT. It is never published to npm. Changes to it are additive only.
- **Chrome (MV3) is the primary target.** Firefox is covered by T-017. Store submission covers Chrome only.

## Requirements

| ID | Requirement |
| --- | --- |
| R1 | `apps/extension` and `packages/protocol` build, lint and ship from the monorepo |
| R2 | The web app detects whether the extension is installed |
| R3 | Requests execute through the extension with no CORS limits (localhost and cloud) |
| R4 | Editor Send uses `sendRequest()`; `onSave` stays persistence-only |
| R5 | Full draft fidelity: method, URL, query, headers, auth, body |
| R6 | Structured errors and a timeout |
| R7 | Cancel an in-flight request |
| R8 | Fallback to `/api/proxy` and an install banner |
| R9 | Binary responses and a response size cap |
| R10 | Binary and file request bodies |
| R11 | Forbidden-header overrides (Origin, Referer, Cookie, User-Agent) |
| R12 | Env-driven origin allowlist and sender validation |
| R13 | Least privilege: per-host consent instead of blanket host access |
| R14 | Safe response rendering and no secret logging |
| R15 | Streaming responses (SSE) |
| R16 | Set-Cookie visibility, redirect chain and coarse timing |
| R17 | Automated unit and end-to-end tests gating CI |
| R18 | Firefox build |
| R19 | Production build and release pipeline |
| R20 | Store listing, privacy policy and submission |
| R21 | Documentation and release runbook |

## Dependency graph

| Task | Title | Depends on |
| --- | --- | --- |
| T-001 | Scaffold extension app and protocol package (walking skeleton) | none |
| T-002 | Background executor and bridge relay | T-001 |
| T-003 | Web client and minimal Send integration | T-002 |
| T-004 | Full draft serialization | T-003 |
| T-005 | Error codes, timeout and error UI | T-003 |
| T-006 | Abort in-flight requests | T-005 |
| T-007 | Proxy fallback and install banner | T-003 |
| T-008 | Binary responses and size cap | T-003 |
| T-009 | Binary request bodies | T-004, T-008 |
| T-010 | Forbidden-header overrides | T-002 |
| T-011 | Env-driven origin allowlist and sender validation | T-002 |
| T-012 | Least-privilege permissions and popup | T-005 |
| T-013 | Safe response rendering and secret hygiene | T-003 |
| T-014 | Streaming responses over ports | T-006, T-008 |
| T-015 | webRequest observation: Set-Cookie, redirects, timing | T-002, T-012 |
| T-016 | Automated end-to-end suite and CI gating | T-006, T-008, T-010, T-012, T-014 |
| T-017 | Firefox build and smoke test | T-012 |
| T-018 | Production build and release pipeline | T-011, T-012, T-015 |
| T-019 | Store assets and privacy policy | T-015 |
| T-020 | Chrome Web Store submission | T-016, T-018, T-019 |
| T-021 | Store link, docs and release runbook | T-007, T-020 |

After T-002, most tasks can run in parallel. The critical path to the store is T-001 → T-002 → T-003 → T-005 → T-012 → T-015 → T-018 → T-020 → T-021.

---

## T-001: Scaffold extension app and protocol package (walking skeleton)

**Goal:** `apps/extension` and `packages/protocol` exist, build from the monorepo root, and a staging deployment of `apps/web` detects the loaded extension.

**Requirements covered:** R1, R2

**Acceptance criteria:**

- `packages/protocol` exists with the ping and pong message types only (`WebToExt`, `ExtToWeb`). Both apps depend on it as `@tramus/protocol` via `workspace:*`.
- `apps/extension` is scaffolded with WXT (TypeScript, Bun) with one background entry and one content script. The content script is injected only on the staging origin and `http://localhost:3000`, and answers ping with pong plus the manifest version.
- `apps/web` has `isExtensionInstalled()` and a small header indicator: Connected (version) or Not installed.
- `bun install`, build (all workspaces), lint and typecheck pass at the repo root. CI runs them on every pull request.
- CI deploys `apps/web` to staging and uploads the extension zip as a build artifact.
- Manual: load the CI zip unpacked, open staging, and the indicator shows connected. Disable the extension and it shows not installed.

**Out of scope:** executing requests, permissions beyond the defaults, popup, icons, Firefox, production origin configuration.

**Notes:** add `transpilePackages: ['@tramus/protocol']` to `next.config.ts` so Next.js can consume the TypeScript source. Keep the allowed origins in a single `app-origins.ts` in the extension (T-011 makes it env-driven).

---

## T-002: Background executor and bridge relay

**Goal:** the extension can execute a text request and return a structured response, verified without any web app changes.

**Requirements covered:** R3

**Acceptance criteria:**

- `@tramus/protocol` adds `TramusRequest` and `TramusResponse` and the `request` and `response` bridge messages.
- The background worker's `execute()` calls `fetch` with `credentials: 'omit'` and `cache: 'no-store'`, and returns status, status text, headers, text body, `sizeBytes` and `timeMs`.
- The content script relays request and response messages between the page and the background worker.
- The manifest requests `host_permissions: ['<all_urls>']` (temporary; T-012 replaces it).
- Manual: from the DevTools console on the staging page, a `postMessage` request to a local server that sends no CORS headers returns the real status and body. The same works for a public API.
- Unit tests cover body decoding.

**Out of scope:** timeouts, abort, error mapping beyond a generic `NETWORK` error, binary bodies, header overrides, the web client library.

---

## T-003: Web client and minimal Send integration

**Goal:** Send in the editor goes through the extension when it is present.

**Requirements covered:** R3, R4

**Acceptance criteria:**

- `lib/extension/client.ts` exposes `sendViaExtension()`, resolving by request `id` through a pending map.
- `lib/request/send-request.ts` exposes `sendRequest()`: it uses the extension when installed, and otherwise calls the existing request path unchanged.
- The editor's Send action calls `sendRequest()` and writes the response and status to the Zustand draft as it does today.
- `onSave` is unchanged and performs only the server action. It makes no HTTP call to the target API.
- In staging, a GET and a POST to a local CORS-less server both return the real response.
- Unit tests with mocked window messaging confirm that concurrent requests resolve to the correct callers.

**Out of scope:** full serialization (T-004), error UI (T-005), abort (T-006), proxy fallback and banner (T-007).

**Notes:** use a minimal inline `toTramusRequest` (method, URL, headers, text body) and `crypto.randomUUID()` for `id`. Guard all `window` access with `typeof window` checks for Next.js server rendering.

---

## T-004: Full draft serialization

**Goal:** everything the editor can configure is sent faithfully.

**Requirements covered:** R5

**Acceptance criteria:**

- `toTramusRequest(draft)` replaces the T-003 inline version. It resolves query params, converts auth to headers, and sets `Content-Type` for JSON and text bodies. Disabled rows are skipped.
- GET and HEAD never carry a body.
- Unit tests cover each auth type the editor supports, empty headers, disabled rows, and JSON versus text bodies.
- A request to `https://httpbin.org/anything` echoes the expected method, headers and body.

**Out of scope:** binary or file bodies (T-009), environment-variable interpolation, new auth types.

---

## T-005: Error codes, timeout and error UI

**Goal:** failures return accurate structured errors and requests can't hang forever.

**Requirements covered:** R6

**Acceptance criteria:**

- Error codes: `INVALID_REQUEST` (bad URL), `NETWORK`, `TIMEOUT`, `EXTENSION_ERROR`. The protocol gains the `ErrorCode` type.
- `timeoutMs` defaults to 30 seconds and can be overridden per request.
- If the background worker is unreachable or throws, the content script returns `EXTENSION_ERROR` instead of leaving the request pending.
- `timeMs` is set on both success and error.
- The response panel shows the error code and message, and the draft status becomes `error`.
- Unit tests cover the error-code mapping.

**Out of scope:** user abort (T-006), retries, automatic fallback to the proxy on error.

**Notes:** abort the controller with a reason (`'timeout'`) and read `signal.reason` in the catch block to distinguish timeout from other failures.

---

## T-006: Abort in-flight requests

**Goal:** the user can cancel a running request and the extension stops it.

**Requirements covered:** R7

**Acceptance criteria:**

- The editor shows a Cancel control while a request is in flight. Cancelling resolves the request with `error.code = 'ABORTED'`.
- The abort message flows page → content script → background, and the background aborts the matching `fetch`.
- The `inflight` map has no leaked entries after success, timeout or abort (unit test).
- Aborting an unknown or already finished `id` is a no-op.

**Out of scope:** aborting proxy-fallback requests, bulk cancel.

---

## T-007: Proxy fallback and install banner

**Goal:** the app still works without the extension, and users who need it are told to install it.

**Requirements covered:** R8

**Acceptance criteria:**

- When the extension is not detected, `sendRequest` posts the `TramusRequest` to `/api/proxy` and returns a `TramusResponse`. Any adapter needed stays inside the route.
- A dismissible banner reads: Install the Tramus Interceptor to call localhost APIs. It disappears once the extension is detected.
- With the extension disabled, a request to a public API succeeds. A request to localhost fails with a clear message that localhost needs the extension.

**Out of scope:** the store link in the banner (T-021), hardening the proxy beyond this contract, a persistent don't-show-again preference.

**Notes:** check the current contract of `app/api/proxy/route.ts` first. This task assumes the proxy stays available as the fallback. If it must not ship to production, only the banner part applies.

---

## T-008: Binary responses and size cap

**Goal:** non-text responses arrive intact, and huge responses can't freeze the app.

**Requirements covered:** R9

**Acceptance criteria:**

- Non-text content types are returned as base64. The response panel renders `image/*` inline and offers a download for other types, showing the byte size.
- The background reads the body incrementally and stops at a 20 MB cap, setting `truncated: true` (additive protocol field). The UI shows a visible truncation notice.
- `sizeBytes` reflects bytes actually received.
- Manual: an image, a PDF and a large file behave as described. A unit test covers text-versus-binary detection.

**Out of scope:** streaming (T-014), in-app PDF rendering, a configurable cap.

---

## T-009: Binary and file request bodies

**Goal:** the editor can send file and binary bodies through the extension.

**Requirements covered:** R10

**Acceptance criteria:**

- `File` and `Blob` inputs are read in the page and serialized as `{ kind: 'base64' }`. The background decodes them to bytes before the `fetch`.
- A file uploaded to an echo endpoint returns the same byte length and checksum.
- Files over the same 20 MB cap are rejected in the UI before sending, with a clear message.

**Out of scope:** a multipart builder UI (unless the editor already has one, in which case only its serialization is covered), chunked upload, upload progress.

---

## T-010: Forbidden-header overrides

**Goal:** Origin, Referer, Cookie and User-Agent set in the editor actually reach the server.

**Requirements covered:** R11

**Acceptance criteria:**

- `stripForbidden` removes the four headers from the `fetch` options, and `withHeaderOverrides` adds a temporary `declarativeNetRequest` session rule for them.
- The rule is removed after every request, whether it succeeds, fails or is aborted. A request without those headers creates no rule.
- Server logs on a local test server confirm that a custom Origin and Cookie arrive.

**Out of scope:** the known limitation that simultaneous same-host requests with different overrides can pick up each other's rule, response Set-Cookie capture (T-015), a cookie jar.

---

## T-011: Env-driven origin allowlist and sender validation

**Goal:** only the intended app origins can drive the extension, and production builds contain no localhost.

**Requirements covered:** R12

**Acceptance criteria:**

- The allowed origins come from a build-time env var and feed both the content script `matches` and the background allowlist.
- A development build includes `http://localhost:3000`, staging includes the staging origin, and production includes only the production origin.
- The background rejects any message whose `sender.url` origin is not allowed, or whose `sender.frameId` is not 0. A unit test covers the validation function.
- Manual: a message sent from a non-allowlisted page gets no response.

**Out of scope:** per-target-host consent (T-012), `externally_connectable`.

---

## T-012: Least-privilege permissions and popup

**Goal:** the extension has no blanket host access. Each target host is granted by the user, and the user can manage grants.

**Requirements covered:** R13

**Acceptance criteria:**

- `host_permissions: ['<all_urls>']` is replaced by `optional_host_permissions: ['<all_urls>']`.
- Before each `fetch`, the background checks `chrome.permissions.contains` for the target host. If it is missing, the request returns the new error code `HOST_NOT_ALLOWED` with the host, and records the host as pending in `chrome.storage.local`.
- The web app shows: Open the Tramus extension and allow `<host>`.
- A toolbar popup shows connection status and version, the pending hosts with a Grant button (which calls `chrome.permissions.request` from the popup, as it needs a user gesture), and the granted hosts with a Revoke button.
- After granting, the same request succeeds without reloading anything. After revoking, it returns `HOST_NOT_ALLOWED` again.

**Out of scope:** an allowlist stored independently of browser permissions, popup styling beyond basic usability, Firefox specifics (T-017).

**Notes:** grants are per host pattern (`<scheme>://<host>/*`), so a grant for localhost is expected to cover all local ports. Confirm this in the manual test and state it in the popup copy.

---

## T-013: Safe response rendering and secret hygiene

**Goal:** untrusted response content cannot execute in the app, and credentials are never logged.

**Requirements covered:** R14

**Acceptance criteria:**

- Response bodies render as text, with no `dangerouslySetInnerHTML` in the response panel (confirmed by a code search).
- Any HTML preview uses a sandboxed iframe with `sandbox=''`.
- Neither the extension nor the client library logs headers or bodies. Any logging sits behind a debug flag that is off by default.
- A response containing a script tag displays as text and never executes.

**Out of scope:** adding an HTML preview if none exists, content-security-policy changes on the web app.

---

## T-014: Streaming responses over ports

**Goal:** server-sent events and chunked responses appear in the UI as they arrive.

**Requirements covered:** R15

**Acceptance criteria:**

- The protocol adds a `stream` option on requests and chunk and end messages.
- The content script opens a long-lived `chrome.runtime.connect` port to the background for streaming requests. The background forwards chunks, and the content script relays them to the page via `postMessage`.
- A local SSE endpoint's events appear incrementally in the response panel.
- Cancel (T-006) stops the stream and closes the port. The 20 MB cap applies.
- The stream survives longer than 30 seconds of silence between events in the background worker's idle window (manual test with a slow SSE endpoint).

**Out of scope:** WebSocket support, automatic reconnect, resumable streams.

---

## T-015: webRequest observation: Set-Cookie, redirects and timing

**Goal:** the response panel shows what `fetch` hides: Set-Cookie headers, the redirect chain, and coarse timing.

**Requirements covered:** R16

**Acceptance criteria:**

- The manifest adds the `webRequest` permission. The background listens to `onBeforeRedirect` and `onHeadersReceived` (with `extraHeaders`) for extension-initiated requests.
- `TramusResponse` gains additive fields: `setCookies`, `redirects` (status, URL, location for each hop) and `timing` (time to first byte and total).
- The panel displays these fields. A request that redirects twice shows both hops. A server that sets cookies shows them.
- Manual checks pass against a local test server for each field.

**Out of scope:** a cookie jar or sending stored cookies, DNS and TLS timing (not available from `webRequest`), WebSocket observation.

**Notes:** correlate events to requests by URL and start time and accept the same-URL concurrency limitation, as in T-010.

---

## T-016: Automated end-to-end suite and CI gating

**Goal:** every pull request proves the extension and `apps/web` still work together.

**Requirements covered:** R17

**Acceptance criteria:**

- A Playwright suite launches Chromium with the built extension loaded and runs against a local echo server that sends no CORS headers.
- Scenarios: detection, GET and POST, header overrides, binary response, abort, timeout, host-consent grant and revoke through the popup page, and SSE streaming.
- CI runs unit tests and the end-to-end suite on every pull request, and a failure blocks merging.

**Out of scope:** Firefox end-to-end tests, performance tests, visual regression tests.

**Notes:** Playwright's persistent-context mode is the assumed way to load an unpacked extension.

---

## T-017: Firefox build and smoke test

**Goal:** the same codebase builds and works on Firefox.

**Requirements covered:** R18

**Acceptance criteria:**

- The Firefox build command produces a working extension (background scripts instead of a service worker).
- On Firefox: detection works, a GET to a CORS-less local server succeeds after granting the host, and the header-override test either passes or is documented as a known limitation.
- The README documents Firefox's host permission behavior.

**Out of scope:** AMO listing, source-code zip for AMO review, features that fail only on Firefox and are not part of the smoke test.

---

## T-018: Production build and release pipeline

**Goal:** CI produces a verified, store-ready Chrome zip from the monorepo.

**Requirements covered:** R19

**Acceptance criteria:**

- A release job (triggered by a version tag) runs `bun install` at the repo root, builds with the production env, and creates the Chrome zip.
- A verification step fails the job if the zip contains `localhost`, `workspace:` or `@tramus/protocol` strings, if the permissions differ from the expected list (`declarativeNetRequest`, `storage`, `webRequest`, optional host `<all_urls>`), or if icons are missing.
- The manifest version comes from `package.json`, and the job fails if the version was not bumped since the last release.
- The zip is stored as an artifact named with the version.

**Out of scope:** automated upload to the store, Firefox packaging, release notes.

---

## T-019: Store assets and privacy policy

**Goal:** everything the Chrome Web Store listing requires exists and is hosted.

**Requirements covered:** R20

**Acceptance criteria:**

- Icons (16, 32, 48, 128) are in the manifest. The store icon and screenshots (1280×800) are in `apps/extension/store/`.
- The listing text, single-purpose statement, and written justifications for `declarativeNetRequest`, `webRequest` and optional host access are in the repo.
- `apps/web` serves a `/privacy` page on staging and production stating that the extension sends no data to Tramus servers and only relays requests the user initiates.

**Out of scope:** promotional tiles and video, translations, marketing site changes.

---

## T-020: Chrome Web Store submission

**Goal:** the extension is submitted to the Chrome Web Store.

**Requirements covered:** R20

**Acceptance criteria:**

- A developer account is registered (one-time fee) and the T-018 release zip is uploaded.
- The listing and Privacy tab are complete: single-purpose statement, permission justifications, no-remote-code declaration, data-usage disclosures and the privacy policy URL.
- The submission is made, and the review status and any feedback are recorded as follow-up issues.
- After approval, the item is published and the store URL is recorded.

**Out of scope:** automated store publishing, Edge and Firefox listings, marketing.

**Notes:** optional host permissions (T-012) are what keep the review manageable. Expect longer review if requested permissions change between versions.

---

## T-021: Store link, docs and release runbook

**Goal:** users can find the installed extension, and the team can release and troubleshoot it without tribal knowledge.

**Requirements covered:** R8, R21

**Acceptance criteria:**

- The T-007 install banner links to the store listing.
- `apps/extension/README.md` covers local development, loading unpacked, the permission model and troubleshooting (extension not detected, HOST\_NOT\_ALLOWED, timeouts).
- `packages/protocol/README.md` states the additive-only rule and who must update both apps when it changes.
- A release runbook describes the flow: bump the version, tag, CI builds and verifies the zip, upload to the store, track review, publish.

**Out of scope:** user-facing help center content, support tooling.

---

## Deferred: needs a design decision first

- **Cookie jar** (storing and sending cookies across requests) needs a data model and a privacy review.
- **WebSocket** support needs an offscreen-document design.
- **`externally_connectable`** is optional in the guide and the postMessage bridge already covers it.
- **Automated store uploads** need store API credentials and a release approval policy.
