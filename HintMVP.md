# Hint Tutor MVP: Requirements and Architecture

Draft v0.1 | 2 November 2026 | Working title | TypeScript-first

## 1. Purpose and scope

This document defines the requirements and architecture for a hint-based tutoring product. Instead of handing students the solution, it guides them to the answer with regulated, escalating hints.

## 3. Assumptions and open questions

**Assumptions**

- A1: The pilot targets items with checkable answers (multiple choice, numeric, short answer with accepted-answer rules).
- A2: BU users are K-5 to K-8 students, so hint text must be short, at a low reading level, and ideally readable aloud.
- A3: The BU pilot is hosted in a US region.
- A4: BU supplies the question content and licenses it for AI processing.

**Open questions to resolve before building**

- **Q1. What is BU's integration role?** BU's own help documentation describes BU being launched from district LMSs over LTI, with assignment deep linking and grade passback, and recommends OneRoster, Clever or ClassLink for rostering. The 1EdTech listing does not say whether BU is certified as a platform or as a tool. If BU is a tool, it may not be able to launch our tool through LTI. Section 8 handles this with adapters.
- **Q3. Real load.** A third-party company profile claims use by millions of students in over 20,000 schools and districts. That is unverified. We need BU's actual enrolled, daily-active and peak-concurrency numbers.
- **Q4. Pilot success metric.** Proposed: a delayed, hint-free post-test one to two weeks later, compared with a control group.
- **Q6. Literacy items.** Passage-based comprehension items need passage context in the hint prompts and possibly read-aloud.

## 4. Users and use cases

- **Student:** attempts items, requests or receives hints, retries, sees progress.
- **Teacher:** assigns item sets, reviews and approves hint ladders, sees class insights, sets hint policy.
- **Institute admin:** registers the LMS, manages tenant settings, retention and data requests.

## 5. MVP requirements

### 5.1 Functional requirements

- **FR1** Launch via LTI 1.3 (or the partner signed launch in section 8) with role mapping for student, teacher and admin.
- **FR3** Student answers an item; correctness is checked deterministically.
- **FR4** On a wrong answer or a help request, the student receives the next hint level from the item's approved ladder, subject to policy (maximum level, cooldown between hints).
- **FR5** Final level shows a worked example on a sibling item, then the student retries. After the attempt limit, the explanation is revealed and the item is scheduled to be asked again later.
- **FR6** Hint-ladder drafts are generated from the item, solution and common mistakes. Only approved ladders are served to students.
- **FR7** A validator checks each ladder at approval time and each served hint for answer leakage, correctness and reading level.
- **FR8** Score passback through LTI Assignment and Grade Services.
- **FR9** Teacher dashboard: per-student progress, most common wrong answers.
- **FR10** Practice mode and assessment mode. Hints are disabled in assessment mode.
- **FR11** Every attempt and hint request is written to an append-only event log.

### 5.3 MVP scope boundaries

In scope: one subject area, checkable item types, LTI 1.3 with Deep Linking and AGS, basic dashboard.


## 6. MVP architecture

### 6.1 Overview

The MVP is a modular monolith plus a small LTI gateway.

- **lti-gateway** : OIDC login, launch validation, Deep Linking responses, AGS and NRPS clients. After a valid launch it creates a one-time code and redirects to the web app. The web app exchanges the code for a short-lived session token held in memory, so no third-party cookie is needed.
- **api** (Fastify, Zod schemas, Drizzle or Prisma): modules for tenancy, content, hints, attempts, grading, analytics and authoring.
- **web** (React, Vite, TanStack Query): student player, teacher dashboard and authoring review in one app, routed by role.
- **Data:** PostgreSQL , Redis 7, S3-compatible object storage.

**Repo layout:** pnpm workspaces and Turborepo with apps/lti-gateway, apps/api, apps/web, apps/worker, and packages/shared-types, packages/hint-engine, packages/lti-adapters.

### 6.2 Key flows

**Student launch**

1. LMS sends login initiation to the gateway.
2. Gateway redirects to the LMS authorization endpoint.
3. LMS posts the signed id\_token. The gateway verifies signature, nonce, issuer, audience and deployment.
4. Gateway upserts tenant, user and course context, creates a one-time code and redirects to the web app.
5. Web app exchanges the code for a session token and loads the assignment.

**Attempt and hint**

1. Web posts an attempt. The API checks it deterministically and stores the event.
2. If wrong, or if help is requested and policy allows, the hint engine picks the level. Wrong MCQ choices map to misconception-specific hints where authored.
3. The API returns the approved hint text from Redis, falling back to Postgres.
4. After a correct answer or the final reveal, a score event is written to the outbox.

**Grade passback**

Worker reads the outbox, obtains an LMS access token (client-credentials with a signed JWT assertion), and posts the score to the line item. Retries use exponential backoff and are idempotent. Failures go to a dead-letter queue visible to admins.

### 6.3 Hint engine

Per student and item, the engine runs a small state machine: ANSWERING, HINT\_L1 to HINT\_L3, WORKED\_EXAMPLE, REVEALED, REASK\_SCHEDULED.

Policy parameters per course or assignment: maxHintLevel, secondsBetweenHints, attemptsBeforeReveal, requireAttemptBeforeHelp, creditPenaltyPerLevel, mode (practice or assessment).

**Ladder format** (JSON, versioned):

- Level 1: nudge (what is the question really asking?)
- Level 2: concept (the idea or rule needed)
- Level 3: first step (the opening move, not the result)
- Level 4: worked example on a sibling item
- Per-distractor hints keyed to common wrong answers


### 6.4 Content and authoring pipeline

1. Items arrive from BU (API, export file or QTI import) and are versioned.
2. Worker generates a draft ladder from the stem, passage if any, solution and common mistakes.
3. Validator scores the draft. Reviewer edits and approves in the web app.
4. Approved ladders are cached. Any item version change retires the old ladder until re-approved.

### 6.5 Core data model

- tenants, platforms (LTI registrations), deployments
- users (tenant\_id, hashed platform subject, role), contexts (courses)
- items (tenant\_id, external\_ref, version, type, stem, passage\_ref, answer\_spec, solution, common\_mistakes, licence\_flags)
- hint\_ladders (item\_id, item\_version, status: draft, approved or retired, levels JSON, reviewed\_by)
- assignments (resource link, item set, policy JSON)
- attempts and hint\_events (append-only, partitioned monthly)
- grade\_outbox (idempotency key, status, retries)
- audit\_log

Every table carries tenant\_id and is protected with row-level security.

### 6.6 API surface (MVP)

- Gateway: POST /lti/login, POST /lti/launch, POST /lti/deeplink, GET /.well-known/jwks.json
- POST /auth/exchange
- GET /assignments/:id
- POST /attempts
- POST /attempts/:id/hints/next
- GET /teacher/assignments/:id/insights
- POST /authoring/items/:id/ladder:generate, PATCH /authoring/ladders/:id, POST /authoring/ladders/:id/approve
- Admin: /admin/platforms, /admin/policies, /admin/data-requests

## 8. Integration design

### 8.1 Principle

Build a **tool-agnostic core** with **integration adapters** around it. This protects us from the open question about BU's role and lets the same core serve any LMS.

### 8.2 Three possible paths

- **Path A: BU as an LTI platform.** BU launches our tool through LTI 1.3 with Deep Linking and AGS. This is the cleanest option and reuses the LTI gateway directly. It requires BU to support adding third-party tools.
- **Path B: Partner embed.** BU embeds our player in its item pages as an iframe. BU's backend generates a short-lived signed JWT with user, class, item and policy. A server-to-server REST API handles item sync and result delivery (webhook or pull). This works even if BU cannot act as an LTI platform.
- **Path C: Sibling tool in a district LMS.** If BU itself is launched from Canvas or Schoology, district teachers can add our tool next to it via LTI. This is not an integration with BU, but it can prove value without BU engineering time.

**Recommendation:** ask BU which of A or B they can support, and build the adapter for that path. The core must be identical in both.

## 9. Full product architecture

### 9.1 Principles

Multi-tenant by design, cells for scale and data residency, event-driven analytics, cache-first serving, safety enforced outside the model, and every LMS or partner behind an adapter.

### 9.2 Logical services

- **Edge:** CDN, WAF, rate limiting, bot protection.
- **Integration Hub:** LTI gateway, partner embed and REST API, OneRoster, Clever and ClassLink SSO, webhooks.
- **Learning Session Service:** attempts, state machine, policy evaluation.
- **Hint Service:** ladder serving, misconception routing, validator calls.
- **Content Service:** item bank, versions, QTI import, licence flags, passage store.
- **Authoring Studio:** generation jobs, review workflow, approval audit trail.
- **Model Gateway:** model routing, structured output, prompt registry, caching, budgets, vendor failover, PII scrubbing.
- **Safety and Validator Service:** leakage, correctness and age-appropriateness checks; adversarial test harness.
- **Student Model Service:** mastery estimation, spaced re-ask scheduler, recommendations.
- **Analytics Pipeline:** events to stream to warehouse; teacher and admin insights.
- **Tenant and Billing:** configuration, quotas, usage metering.
- **Experimentation:** feature flags and A/B assignment for learning-outcome studies.

### 9.3 Data architecture

- **Operational:** Postgres per cell with row-level security, read replicas for dashboards, partitioned event tables.
- **Streaming:** Kafka-compatible log (MSK, Redpanda or Kinesis) for attempt, hint and grade events.
- **Analytics:** ClickHouse or a warehouse for insights; xAPI or Caliper export for institutes.
- **Cache:** Redis cluster for ladders, policies, sessions.
- **Search and retrieval:** pgvector first, OpenSearch if content retrieval grows.
- **Objects:** S3 for imports, exports and audit archives.

## 09. Roadmap and exit criteria

- **Phase 0: Discovery (2 weeks).** Technical call with BU on Q1 to Q6; choose path A or B; confirm licensing and metrics. Exit: signed scope and sample item export.
- **Phase 1: MVP build (about 8 to 10 weeks, indicative).** Gateway, hint engine, authoring, dashboard, passback. Exit: end-to-end demo in a test LMS and a BU sandbox; adversarial suite passing.
- **Phase 2: Pilot (one term).** One course, treatment and control, delayed post-test. Exit: usable retention data and engagement above an agreed threshold.
- **Phase 3: Scale-out.** Guarded chat, mastery and spaced re-ask, OneRoster and SSO, second LMS, cell architecture, certifications.
- **Phase 4: Platform.** Authoring marketplace, self-serve onboarding, multi-region, billing.

## 11. Risks

- Students avoid hints (mitigation: help after failure, credit for assisted retries, in-workflow placement).
- Answer leakage (mitigation: pre-approved ladders, validator, adversarial CI).
- BU cannot act as an LTI platform (mitigation: adapter design, path B).
- Content licensing blocks AI processing (mitigation: resolve in Phase 0).
- Wrong or low-quality hints (mitigation: teacher approval, correctness checks).
- LMS and AI vendors ship competing features (mitigation: institute content, analytics, measured outcomes).
- Child-data compliance (mitigation: minimisation, legal review, no open chat at MVP).
