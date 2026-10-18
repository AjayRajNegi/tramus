# Tramus: Database Schema

*Version 1.0 · Based on Prisma schema + migrations*

---

## 1. Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │       │  Workspace  │       │  Scenario   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │◄──────│ ownerId (FK)│       │ workspaceId │
│ email (UK)  │       │ id (PK)     │◄──────│ id (PK)     │
│ name        │       │ name        │       │ name        │
│ createdAt   │       │ createdAt   │       │ createdAt   │
│ updatedAt   │       │ updatedAt   │       │ updatedAt   │
└─────────────┘       └──────┬──────┘       └──────┬──────┘
                             │                      │
              ┌──────────────┼──────────────┐       │
              ▼              ▼              ▼       ▼
       ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
       │  Endpoint   │ │ RequestLog  │ │  (future)   │
       ├─────────────┤ ├─────────────┤ │  Snapshot   │
       │ id (PK)     │ │ id (PK)     │ │  ShareLink  │
       │ workspaceId │ │ workspaceId │ │  OwnerToken │
       │ scenarioId  │ │ scenarioId  │ └─────────────┘
       │ method      │ │ requestId   │
       │ path        │ │ method      │
       │ response    │ │ path        │
       │   Status    │ │ statusCode  │
       │   Headers   │ │ durationMs  │
       │   Body      │ │ responseSize│
       │ errorConfig │ │ createdAt   │
       └─────────────┘ └─────────────┘
```

---

## 2. Tables

### 2.1 `users`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, `default(uuid())` | Unique user identifier |
| `email` | String | Unique | User email (for Phase 3 accounts) |
| `name` | String | Nullable | Display name |
| `created_at` | Timestamp | `default(now())` | Account creation |
| `updated_at` | Timestamp | `@updatedAt` | Last update |

**Indexes:** Unique on `email`

**Notes:** Phase 3 feature. Currently unused (anonymous workspaces only).

---

### 2.2 `workspaces`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, `default(uuid())` | Workspace identifier |
| `name` | String | Not null | User-defined name |
| `owner_id` | UUID | FK → `users.id`, Cascade delete | Owner (Phase 3) |
| `created_at` | Timestamp | `default(now())` | Creation time |
| `updated_at` | Timestamp | `@updatedAt` | Last modification |

**Indexes:**
- `workspaces_ownerId_idx` on `owner_id`

**Anonymous Workspaces:** For Phase 1-2, `owner_id` references a placeholder or the workspace is created without auth. Ownership proven via owner token in browser localStorage.

**Future (Phase 3):** Team workspaces → add `WorkspaceMember` join table with roles.

---

### 2.3 `scenarios`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, `default(uuid())` | Scenario identifier |
| `name` | String | Not null | Scenario name (e.g., "main", "payment-failure") |
| `workspace_id` | UUID | FK → `workspaces.id`, Cascade delete | Parent workspace |
| `created_at` | Timestamp | `default(now())` | Creation time |
| `updated_at` | Timestamp | `@updatedAt` | Last modification |

**Indexes:**
- `scenarios_workspaceId_idx` on `workspace_id`
- Unique on `(workspace_id, name)`

**Special:** Every workspace has a `main` scenario created by default.

**Future:** Add `parent_scenario_id` (FK → self), `fork_event_id` for fork tracking.

---

### 2.4 `endpoints`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, `default(uuid())` | Endpoint identifier |
| `workspace_id` | UUID | FK → `workspaces.id`, Cascade delete | Workspace (denormalized for queries) |
| `scenario_id` | UUID | FK → `scenarios.id`, Cascade delete | Owning scenario |
| `method` | HttpMethod | Not null | HTTP method |
| `path` | String | Not null | Path template (e.g., `/users/:id`) |
| `response_status` | Integer | Default 200 | HTTP status code |
| `response_headers` | JSONB | Default `'{}'` | Response headers as key-value object |
| `response_body` | JSONB | Nullable | Response body (JSON) |
| `error_config` | JSONB | Nullable | Latency/fault simulation config |
| `created_at` | Timestamp | `default(now())` | Creation time |
| `updated_at` | Timestamp | `@updatedAt` | Last modification |

**Indexes:**
- `endpoints_workspaceId_scenarioId_idx` on `(workspace_id, scenario_id)`
- Unique on `(scenario_id, method, path)` — enforces FR-ED-4 (no duplicate method+path per scenario)

**Notes on JSONB columns:**
```json
// response_headers
{ "Content-Type": "application/json", "X-Custom": "value" }

// response_body
{ "users": [{ "id": 1, "name": "Jane" }] }

// error_config (FR-SIM)
{
  "latency": { "type": "range", "minMs": 100, "maxMs": 1000 },
  "faults": [
    { "type": "probabilistic", "probability": 0.1, "status": 500 },
    { "type": "patterned", "everyN": 5, "status": 503 }
  ]
}
```

**Future (FR-RL):** Add `rules` JSONB column for conditional response rules.

**Future (FR-ED-2):** Multiple named responses → separate `EndpointResponse` table or JSONB array.

---

### 2.5 `request_logs`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, `default(uuid())` | Log entry identifier |
| `workspace_id` | UUID | FK → `workspaces.id`, Cascade delete | Workspace (denormalized) |
| `scenario_id` | UUID | FK → `scenarios.id` | Scenario at time of request |
| `request_id` | String | Unique | Client-generated UUID (correlates with extension) |
| `method` | HttpMethod | Not null | HTTP method |
| `path` | String | Not null | Request path |
| `status_code` | Integer | Not null | Response status |
| `duration_ms` | Integer | Not null | Total request duration |
| `response_size_bytes` | Integer | Nullable | Response body size |
| `created_at` | Timestamp | `default(now())` | Request timestamp |
| `updated_at` | Timestamp | `@updatedAt` | (Unused, Prisma default) |

**Indexes:**
- `request_logs_requestId_key` unique on `request_id`
- `request_logs_workspaceId_createdAt_idx` on `(workspace_id, created_at)`
- `request_logs_scenarioId_createdAt_idx` on `(scenario_id, created_at)`

**Retention:** 5,000 events per scenario (config changes never pruned). Implemented via background job or query limit.

**Future (FR-TL-3):** Add `config_snapshot` JSONB to store exact endpoint config at execution time.

**Future (FR-LG-3):** Live streaming → consider separate `request_events` table with partitions.

---

### 2.6 `HttpMethod` Enum

```sql
CREATE TYPE "HttpMethod" AS ENUM (
  'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'
);
```

Used by `endpoints.method` and `request_logs.method`.

---

## 3. Missing Tables (Per Requirements)

The following tables are **not yet in schema** but required by FR:

| Table | Purpose | Requirements |
|-------|---------|--------------|
| `snapshots` | Immutable workspace/scenario copies for sharing | FR-SH-10 |
| `share_links` | Token → snapshot/scenario mapping + permissions + expiry | FR-SH-2 to FR-SH-9 |
| `owner_tokens` | Browser-held ownership proof for anonymous workspaces | FR-SH-8 |
| `endpoint_rules` | Conditional response rules (FR-RL) | FR-RL-1 to FR-RL-10 |
| `endpoint_responses` | Multiple named responses per endpoint (FR-ED-2) | FR-ED-2 |
| `timeline_events` | Unified event log (config changes + requests) | FR-TL-2, FR-TL-3 |
| `mock_keys` | Rotatable unguessable keys per scenario (FR-MS-1, FR-MS-6) | FR-MS-1, FR-MS-6 |

---

## 4. Proposed Schema Extensions

### 4.1 Snapshots & Sharing (FR-SH)

```prisma
model Snapshot {
  id           String   @id @default(uuid())
  workspaceId  String
  workspace    Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  scenarioId   String?
  scenario     Scenario? @relation(fields: [scenarioId], references: [id], onDelete: SetNull)
  name         String   // "Snapshot of payment-failure at 2026-10-18"
  data         Json     // Full workspace/scenario export
  sizeBytes    Int
  s3Key        String   // S3 object key
  createdAt    DateTime @default(now())
  expiresAt    DateTime?

  @@index([workspaceId])
  @@map("snapshots")
}

model ShareLink {
  id           String   @id @default(uuid())
  tokenHash    String   @unique // bcrypt/argon2 hash of 256-bit token
  workspaceId  String
  workspace    Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  scenarioId   String?
  snapshotId   String?  // If snapshot link (immutable)
  permission   SharePermission @default(VIEW)
  type         ShareType @default(SNAPSHOT)
  expiresAt    DateTime?
  revokedAt    DateTime?
  createdAt    DateTime @default(now())
  lastAccessed DateTime?

  @@index([workspaceId])
  @@map("share_links")
}

enum SharePermission {
  VIEW
  USE
  EDIT
}

enum ShareType {
  SNAPSHOT
  LIVE
}

model OwnerToken {
  id        String   @id @default(uuid())
  tokenHash String   @unique // hash of 256-bit token
  workspaceId String  @unique
  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  @@map("owner_tokens")
}
```

### 4.2 Timeline Events (FR-TL)

```prisma
model TimelineEvent {
  id            String   @id @default(uuid())
  scenarioId    String
  scenario      Scenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)
  sequence      Int      // Monotonic per scenario
  type          EventType
  payload       Json     // Config change or request execution data
  configSnapshot Json?   // Full endpoint config at this point (for FR-TL-3)
  createdAt     DateTime @default(now())

  @@unique([scenarioId, sequence])
  @@index([scenarioId, createdAt])
  @@map("timeline_events")
}

enum EventType {
  ENDPOINT_CREATED
  ENDPOINT_UPDATED
  ENDPOINT_DELETED
  RULE_ADDED
  RULE_UPDATED
  RULE_DELETED
  REQUEST_EXECUTED
  SCENARIO_FORKED
  SCENARIO_RENAMED
  SCENARIO_ARCHIVED
}
```

**Fork Implementation:** New scenario gets `parentScenarioId` + `forkEventSequence`. Query merges parent events ≤ fork sequence + child's own events.

### 4.3 Conditional Rules (FR-RL)

```prisma
model EndpointRule {
  id          String @id @default(uuid())
  endpointId  String
  endpoint    Endpoint @relation(fields: [endpointId], references: [id], onDelete: Cascade)
  name        String // e.g., "premium-user"
  priority    Int    // Evaluation order (lower = first)
  condition   Json   // AST: { all: [{ source: "header", key: "x-user-type", op: "equals", value: "premium" }] }
  outcome     Json   // { responseName: "premium-response", latencyOverride: 200, faultOverride: null }
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([endpointId])
  @@map("endpoint_rules")
}
```

### 4.4 Multiple Responses (FR-ED-2)

```prisma
model EndpointResponse {
  id            String @id @default(uuid())
  endpointId    String
  endpoint      Endpoint @relation(fields: [endpointId], references: [id], onDelete: Cascade)
  name          String // e.g., "premium-response", "standard-response"
  isDefault     Boolean @default(false)
  status        Int    @default(200)
  headers       Json   @default("{}")
  body          Json?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([endpointId, name])
  @@index([endpointId])
  @@map("endpoint_responses")
}
```

### 4.5 Mock Keys (FR-MS-1, FR-MS-6)

```prisma
model MockKey {
  id        String   @id @default(uuid())
  scenarioId String  @unique
  scenario  Scenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)
  keyHash   String   @unique // Hash of unguessable key
  keyPrefix String   // First 8 chars for display
  createdAt DateTime @default(now())
  revokedAt DateTime?
  @@map("mock_keys")
}
```

---

## 5. Migration History

| Migration | Date | Description |
|-----------|------|-------------|
| `20260917050233_init` | 2026-09-17 | Initial (User, Post - template) |
| `20260919050214_mapped_the_models` | 2026-09-19 | Renamed User→users, Post→posts, added email unique |
| `20260922193615_mvp_schema` | 2026-09-22 | **Current MVP**: Workspace, Scenario, Endpoint, RequestLog, HttpMethod enum |

---

## 6. Query Patterns & Indexing Strategy

| Query | Index Used |
|-------|------------|
| Workspaces by owner | `workspaces_ownerId_idx` |
| Scenarios in workspace | `scenarios_workspaceId_idx` |
| Scenario by workspace+name | `scenarios_workspaceId_name_key` |
| Endpoints in scenario | `endpoints_workspaceId_scenarioId_idx` |
| Endpoint by scenario+method+path | `endpoints_scenarioId_method_path_key` (mock server lookup) |
| Request logs by workspace+time | `request_logs_workspaceId_createdAt_idx` |
| Request logs by scenario+time | `request_logs_scenarioId_createdAt_idx` |
| Request log by requestId | `request_logs_requestId_key` |

---

## 7. Prisma Configuration

```typescript
// packages/db/prisma7.config.ts
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  // Prisma 7 uses new config format
});
```

**Client Output:** `packages/db/app/generated/prisma/`

**Commands:**
```bash
bunx prisma generate    # Generate client
bunx prisma migrate dev # Create/apply migration
bunx prisma db push     # Push schema without migration
bunx prisma studio      # Visual editor
```

---

## 8. Data Size Estimates (Per Limits)

| Entity | Max Count | Est. Row Size | Max Storage |
|--------|-----------|---------------|-------------|
| Workspaces | 1/user | ~500 bytes | Negligible |
| Scenarios | 20/workspace | ~500 bytes | ~10 KB/workspace |
| Endpoints | 100/workspace | ~2 KB (JSONB) | ~200 KB/workspace |
| RequestLogs | 5,000/scenario | ~800 bytes | ~4 MB/scenario |
| Snapshots | 50/workspace | 10 MB | 500 MB/workspace |

**Total per active workspace:** ~5-10 MB (well within PostgreSQL limits)

---

## 9. Future Considerations

- **Partitioning:** `request_logs` by `created_at` monthly when >100M rows
- **Read Replicas:** For analytics/dashboard queries
- **Soft Deletes:** Add `deleted_at` for audit trail (FR-TL-4: history never destroyed)
- **Event Store:** Consider separate event store (EventStoreDB) for timeline events at scale
- **Full-Text Search:** Add `tsvector` column on `endpoints.path` + `request_logs.path` for FR-LG-2 search