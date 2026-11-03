# AI Hint Tutor: Requirements and Architecture

Draft v0.1 | 2 November 2026 | Working title | TypeScript-first

## 1. Purpose and scope

This document defines the requirements and architecture for a hint-based tutoring product. Instead of handing students the solution, it guides them to the answer with regulated, escalating hints. It covers two things: an MVP to pilot with Benchmark Universe (BU), and the target architecture for a multi-tenant product that can serve BU or any other LMS at scale. TypeScript is the main language throughout.

## 2. Design principles from the research

1. **Guardrails are mandatory.** In a field study of nearly 1,000 high school students, unrestricted GPT-4 access raised practice scores but cut later exam scores by 17%. A hint-based tutor largely removed the harm, but its exam scores were only about equal to the control group. Success must be measured by delayed, unassisted tests, not by practice scores.
2. **Engagement is the main risk.** In a two-year Tennessee trial (draft paper), students largely stopped using Khanmigo when it withheld answers, and it added nothing beyond Khan Academy practice alone. Help must appear at the moment of failure, inside the workflow, with credit for assisted retries.
3. **Prompts alone do not hold the line.** Adversarial studies show that emotional pressure and rapport-building extract answers from tutors. Defences such as a pedagogical reasoning step and multi-agent checks cut leakage from about 46% to 2-4% in one setup. We enforce limits in the architecture: pre-approved hint ladders, an independent validator, and fail-closed behaviour.
4. **Ground truth comes from the institute.** The tutor needs a teacher-approved solution and common mistakes for every item.
5. **A generic Socratic chatbot is a commodity.** ChatGPT, Gemini and Claude all ship study modes, and Canvas has LLM-enabled assignments. Our edge is institute-specific content, teacher control, hint analytics, gradebook integration and measured retention.
6. **Students are minors.** Privacy, data minimisation and a no-open-chat MVP follow from this.

## 3. Assumptions and open questions

**Assumptions**

- A1: The pilot targets items with checkable answers (multiple choice, numeric, short answer with accepted-answer rules).
- A2: BU users are K-5 to K-8 students, so hint text must be short, at a low reading level, and ideally readable aloud.
- A3: The BU pilot is hosted in a US region.
- A4: BU supplies the question content and licenses it for AI processing.

**Open questions to resolve before building**

- **Q1. What is BU's integration role?** BU's own help documentation describes BU being launched from district LMSs over LTI, with assignment deep linking and grade passback, and recommends OneRoster, Clever or ClassLink for rostering. The 1EdTech listing does not say whether BU is certified as a platform or as a tool. If BU is a tool, it may not be able to launch our tool through LTI. Section 8 handles this with adapters.
- **Q2. Content licensing.** Publisher content is copyrighted. We need written permission to send item text and solutions to an LLM vendor, and to store them.
- **Q3. Real load.** A third-party company profile claims use by millions of students in over 20,000 schools and districts. That is unverified. We need BU's actual enrolled, daily-active and peak-concurrency numbers.
- **Q4. Pilot success metric.** Proposed: a delayed, hint-free post-test one to two weeks later, compared with a control group.
- **Q5. LLM vendor approval,** data processing agreement and retention terms acceptable to BU.
- **Q6. Literacy items.** Passage-based comprehension items need passage context in the hint prompts and possibly read-aloud.

## 4. Users and use cases

- **Student:** attempts items, requests or receives hints, retries, sees progress.
- **Teacher:** assigns item sets, reviews and approves hint ladders, sees class insights, sets hint policy.
- **Institute admin:** registers the LMS, manages tenant settings, retention and data requests.
- **Content reviewer:** BU staff or teachers who approve generated hints.
- **Platform operator (us):** monitors quality, cost, safety and uptime.

Core use cases: UC1 launch from the LMS; UC2 teacher picks items; UC3 student attempts and gets a hint after a wrong answer; UC4 hints escalate to a worked example; UC5 score returns to the gradebook; UC6 teacher reviews hint-usage insights; UC7 reviewer approves a generated hint ladder.

## 5. MVP requirements

### 5.1 Functional requirements

- **FR1** Launch via LTI 1.3 (or the partner signed launch in section 8) with role mapping for student, teacher and admin.
- **FR2** Teacher selects an item set through Deep Linking, creating an assignment.
- **FR3** Student answers an item; correctness is checked deterministically.
- **FR4** On a wrong answer or a help request, the student receives the next hint level from the item's approved ladder, subject to policy (maximum level, cooldown between hints).
- **FR5** Final level shows a worked example on a sibling item, then the student retries. After the attempt limit, the explanation is revealed and the item is scheduled to be asked again later.
- **FR6** Hint-ladder drafts are generated from the item, solution and common mistakes. Teachers review, edit and approve. Only approved ladders are served to students.
- **FR7** A validator checks each ladder at approval time and each served hint for answer leakage, correctness and reading level.
- **FR8** Score passback through LTI Assignment and Grade Services (AGS). Credit is reduced by hint depth according to a configurable policy.
- **FR9** Teacher dashboard: per-item hint depth, per-student progress, most common wrong answers.
- **FR10** Practice mode and assessment mode. Hints are disabled in assessment mode.
- **FR11** Every attempt and hint request is written to an append-only event log.
- **FR12** Admin can register an LMS platform and set retention and data-export rules.
- **FR13** Tenant data deletion and export on request.

Explicitly **no open-ended chat** in the MVP. Students interact only with the structured hint ladder.

### 5.2 Non-functional requirements

- **Performance:** cached hint response p95 under 300 ms server-side; page ready in under 2 s on a school Chromebook.
- **Load:** 500 concurrent students and a launch storm of 500 launches in 60 seconds.
- **Availability:** 99.5% during the pilot; design toward 99.9% in school hours.
- **Degradation:** if the LLM is down, serve approved ladders. If the validator is down, fail closed.
- **Accessibility:** WCAG 2.1 AA.
- **Browsers:** Chrome, Edge and Safari on Chromebooks, iPads and desktops.
- **No reliance on third-party cookies** inside LMS iframes.
- **Security:** tenant isolation, encryption in transit and at rest, audit log.
- **Cost visibility:** tokens and cost per active student tracked from day one.

### 5.3 MVP scope boundaries

In scope: one subject area, checkable item types, LTI 1.3 with Deep Linking and AGS, teacher review of ladders, basic dashboard, one LLM vendor behind a gateway.

Out of scope: free-text chat, essay or open-response feedback, adaptive sequencing, multi-region, self-serve onboarding, billing, native mobile apps.

## 6. MVP architecture

### 6.1 Overview

The MVP is a **modular monolith plus a small LTI gateway**. This keeps the team small and deployment simple, while module boundaries leave room to split services later.

- **lti-gateway** (Node, ltijs on Express): OIDC login, launch validation, Deep Linking responses, AGS and NRPS clients. After a valid launch it creates a one-time code and redirects to the web app. The web app exchanges the code for a short-lived session token held in memory, so no third-party cookie is needed.
- **api** (Fastify, Zod schemas, Drizzle or Prisma): modules for tenancy, content, hints, attempts, grading, analytics and authoring.
- **web** (React, Vite, TanStack Query): student player, teacher dashboard and authoring review in one app, routed by role.
- **worker** (BullMQ): ladder generation, validation, grade-passback outbox, nightly rollups.
- **llm-gateway** (shared package): provider-agnostic interface, structured output validated by Zod, timeouts, retries, per-tenant budgets, PII scrubbing, request logging.
- **Data:** PostgreSQL 16 (row-level security by tenant\_id), Redis 7 (cache, rate limits, queues), S3-compatible object storage.

**Repo layout:** pnpm workspaces and Turborepo with apps/lti-gateway, apps/api, apps/web, apps/worker, and packages/shared-types, packages/hint-engine, packages/llm-gateway, packages/lti-adapters.

**Hosting (example on AWS):** ECS Fargate for containers, RDS Postgres Multi-AZ, ElastiCache, CloudFront and WAF, Secrets Manager, infrastructure in Terraform. Equivalent services on GCP or Azure work too. Use a US region for the BU pilot.

**Known risk:** ltijs defaults to MongoDB and uses database plugins for other stores. Verify a maintained Postgres plugin early. Fallback is a thin in-house LTI layer using the jose library for JWT handling.

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

**Leak prevention** has three layers. First, ladders are generated offline and approved by a teacher, so live generation never sees the student's free text. Second, a deterministic check compares each hint to the normalised answer and solution (exact, numeric and fuzzy match). Third, an LLM judge from a different model family scores leakage and correctness. Any failure blocks the hint, serves the previous approved level and flags the item for review.

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

### 6.7 Security and privacy

- Collect the minimum: opaque user ID, role, course. No names or emails unless a feature needs them.
- No student free text reaches an LLM in the MVP.
- Contractual zero-retention or no-training terms with the LLM vendor.
- Per-tenant encryption keys (KMS) and configurable retention.
- US: expect COPPA and FERPA obligations. India: the DPDP Rules require verifiable parental consent for under-18 data and restrict behavioural monitoring, with an educational-institution exemption limited to educational activities and safety. Get legal review before handling student data.
- Pursue 1EdTech LTI Advantage certification and data-privacy certification once the pilot is stable.

### 6.8 Observability and evaluation

- Logs, metrics and traces with OpenTelemetry; dashboards per tenant.
- Product metrics: hint depth per item, time to correct, abandonment after hint, return rate.
- Safety metrics: validator block rate, leak rate on an adversarial test suite run in CI on every prompt or model change.
- Learning metric: delayed hint-free post-test versus control, defined with the school before launch.

## 7. Capacity model

These are planning assumptions to replace with BU's real numbers (Q3).

**MVP pilot:** 5,000 enrolled, 500 peak concurrent. At one hint request per student every 40 seconds, peak is about 12 requests per second, plus bursts at class start. Any single modest instance set handles this. The real constraint is the launch storm, not steady load.

**Full scale scenario:** 1,000,000 enrolled, 15% daily active (150,000), 12 hint requests per active student per day, which is 1.8 million per day. If 80% of traffic falls in a four-hour window spread across US time zones, that is roughly 100 requests per second sustained and about 300 per second at peak. With 85 to 90% served from cache, LLM-involved requests stay under about 45 per second at peak. Batch generation runs off-peak.

**Design consequences**

- Hints are read-heavy and cacheable: pre-generate and cache ladders at the edge of the service (Redis, then Postgres).
- Launches are bursty: stateless handlers, platform configuration cached, JWKS cached, autoscaling plus scheduled pre-warm for school start times.
- The LLM is the scarce resource: queue, rate-limit and budget per tenant. Never place it on the critical path for cached hints.
- Grade passback must be asynchronous so LMS slowness never blocks students.

## 8. Benchmark Universe integration design

### 8.1 Principle

Build a **tool-agnostic core** (hint engine, content, attempts, analytics) with **integration adapters** around it. This protects us from the open question about BU's role and lets the same core serve any LMS.

### 8.2 Three possible paths

- **Path A: BU as an LTI platform.** BU launches our tool through LTI 1.3 with Deep Linking and AGS. This is the cleanest option and reuses the LTI gateway directly. It requires BU to support adding third-party tools.
- **Path B: Partner embed.** BU embeds our player in its item pages as an iframe. BU's backend generates a short-lived signed JWT with user, class, item and policy. A server-to-server REST API handles item sync and result delivery (webhook or pull). This works even if BU cannot act as an LTI platform.
- **Path C: Sibling tool in a district LMS.** If BU itself is launched from Canvas or Schoology, district teachers can add our tool next to it via LTI. This is not an integration with BU, but it can prove value without BU engineering time.

**Recommendation:** ask BU which of A or B they can support, and build the adapter for that path. The core must be identical in both.

### 8.3 Adapter contract

```ts
interface IntegrationAdapter {
  verifyLaunch(req: IncomingRequest): Promise<LaunchContext>;
  listItems(ctx: LaunchContext): Promise<ExternalItem[]>;
  submitResult(ctx: LaunchContext, result: ScoreResult): Promise<void>;
  syncRoster?(ctx: LaunchContext): Promise<RosterEntry[]>;
}
```

Implementations: LtiAdapter (gateway-backed), SignedEmbedAdapter (JWT launch plus REST), later OneRosterAdapter for rostering.

### 8.4 Identity and rostering

Store only an opaque platform subject per user, mapped to an internal user ID, scoped by tenant. BU recommends OneRoster, Clever or ClassLink for rostering because LTI rostering is limited. Plan optional OneRoster and SSO adapters after the pilot, but the MVP works with launch-time identity only.

### 8.5 Content sync

One-way sync from BU to us: items, passages, solutions, versions. Hash each item version. Changed items retire their ladders until re-approved. Licence flags on each item control whether it may be sent to an LLM.

### 8.6 Results

Path A uses AGS. Path B uses a signed webhook with idempotency keys, plus a pull endpoint. We never send hint text back to the LMS, only score, completion status and optional hint-depth summary.

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

### 9.4 Scale and resilience

- **Cells:** each cell is a full stack (services, database, cache) for a set of tenants. Large tenants like BU can have a dedicated cell. Cells per region give data residency, for example US and India.
- **Stateless services** autoscale on requests and queue depth; schedule-based scaling for school-day peaks.
- **Backpressure:** per-tenant rate limits and queues; LLM calls budgeted per tenant and degraded gracefully.
- **Degradation order:** serve cached approved ladders, then disable live generation, then read-only mode. Validator failure always fails closed.
- **Outbox and idempotency** everywhere a write leaves the system (grades, webhooks).
- **SLOs:** 99.9% availability in school hours, cached hint p95 under 300 ms, LLM-backed hint p95 under 3 s, grade passback delivered within 5 minutes for 99% of events.
- **Disaster recovery:** cross-region backups, tested restore, RPO 15 minutes and RTO 1 hour as initial targets.

### 9.5 AI platform

- Prompt and model versions are registered and tied to every generated ladder.
- Offline evaluation suite: correctness, leakage under adversarial student simulation, reading-level fit, subject-specific checks. It runs in CI and gates releases.
- Phase 2 adds a **guarded follow-up chat**: student free text passes a safety filter, a tutor model sees only the approved ladder and a help ceiling, and an independent validator checks the reply before it is shown.
- Vendor-neutral routing with fallbacks, plus periodic review of cost per active student.

### 9.6 Tenancy and compliance

- Pooled tenancy by default; silo or dedicated cell for large or regulated tenants.
- Per-tenant keys, retention policies and data-subject workflows.
- Roadmap: SOC 2, 1EdTech LTI Advantage and data-privacy certifications, COPPA and FERPA alignment, DPDP alignment for Indian tenants.

### 9.7 Evolution from MVP

Split the modular monolith along existing module lines in this order: Model Gateway and Validator first (different scaling and safety needs), then Analytics, then Content and Authoring, then Session and Hint services. Keep the LTI gateway separate from day one.

## 10. Roadmap and exit criteria

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
- LLM cost and rate limits (mitigation: caching, pre-generation, budgets).

## 12. References

- Bastani et al., Generative AI without guardrails can harm learning, PNAS 2025: doi.org/10.1073/pnas.2422633122
- Hechinger Report, Khanmigo study coverage, 21 Sept 2026: hechingerreport.org/proof-points-khanmigo-math-ai-tutor
- Zhao et al., Evaluating Answer Leakage Robustness of LLM Tutors, 2026: arxiv.org/abs/2604.18660
- 1EdTech LTI 1.3 and LTI Advantage; Benchmark Universe certification listing: site.imsglobal.org/certifications/benchmark-education/benchmark-universe
- Benchmark Universe help: Add Data for a New District Term (rostering and LTI limitations): help.benchmarkuniverse.com
- India DPDP Rules 2025, Rules 10 to 12 and Fourth Schedule: dpdpa.com
