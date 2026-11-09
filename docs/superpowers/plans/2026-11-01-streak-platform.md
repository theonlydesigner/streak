# STREAK Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an end-to-end STREAK MVP that accepts gym attendance webhooks, calculates durable member streaks, broadcasts recognition events, and drives a 4K display with a timed welcome card and live top-10 leaderboard.

**Architecture:** Use a pnpm TypeScript monorepo with a Fastify cloud API, PostgreSQL persistence through Prisma, and Redis for cross-process event fanout. The display client is a kiosk-oriented Next.js app consuming an SSE stream; a shared package owns validated event contracts and streak calculations. Tenant/gym configuration and device credentials are explicit in the API so multiple commercial gym installations can be supported without coupling hardware logic to the display.

**Tech Stack:** TypeScript, pnpm workspaces, Fastify, Zod, Prisma, PostgreSQL, Redis, Next.js App Router, React, Vitest, Playwright, Docker Compose.

**Spec:** User-provided STREAK product brief in the task prompt; no repository spec file exists in the empty workspace.

## Global Constraints

- The inbound hardware integration is an HTTPS POST containing `member_id` and `timestamp`.
- Attendance processing must apply same-day deduplication.
- Consecutive daily visits increment the active streak; a missed day resets the active counter to `1` while preserving the personal-best record.
- Every accepted attendance must be publishable to the configured display through WebSockets or SSE.
- The welcome card must be high contrast, show flame graphics and dynamic motivational text, and remain visible for exactly `5 seconds` before returning to idle.
- Idle mode must rank the `top 10 members by current active streak` and show each member’s personal-best record.
- The display target is a `43" 4K commercial wall display` driven by an HDMI media-player box; the web client must support kiosk operation and reconnect after stream interruption.
- Do not log raw credential secrets or expose member data outside the configured gym tenant.

## Review Focus

- Duplicate taps for the same member on one calendar day must not increment the streak or emit a second welcome event; add this assertion to Task 2.
- Timestamps around midnight and gym timezone boundaries must use the gym’s configured IANA timezone; add boundary tests to Task 2.
- A webhook retry with the same delivery identifier must be idempotent even after the first request succeeded; add this assertion to Task 3.
- An SSE client that disconnects during a welcome event must reconnect and receive the next event without duplicating stale UI state; add this assertion to Task 5.
- A tenant/device using an invalid or revoked credential must receive a clear authorization error and must not mutate attendance; add this assertion to Task 3.

---

### Task 1: Bootstrap the monorepo and shared contracts

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `apps/api/package.json`
- Create: `apps/display/package.json`
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/src/attendance.ts`
- Create: `packages/contracts/src/display-events.ts`
- Create: `packages/contracts/src/index.ts`
- Create: `docker-compose.yml`
- Test: `packages/contracts/src/*.test.ts`

**Interfaces:**
- Produces `AttendanceWebhook { gymId: string; memberId: string; timestamp: string; deliveryId: string }`.
- Produces `WelcomeEvent { type: "welcome"; gymId: string; memberId: string; memberDisplayName: string; activeStreak: number; personalBest: number; occurredAt: string; expiresAt: string }`.
- Produces `LeaderboardEntry { memberId: string; memberDisplayName: string; activeStreak: number; personalBest: number }`.
- Produces `LeaderboardSnapshot { gymId: string; entries: LeaderboardEntry[]; generatedAt: string }`.
- Exports Zod schemas and inferred TypeScript types for all API/display payloads.

- [ ] **Step 1: Write failing contract tests** for valid webhook parsing, rejection of missing `member_id`/`timestamp`, exact `WelcomeEvent` fields, and a leaderboard capped at 10 entries.
- [ ] **Step 2: Run `pnpm vitest run packages/contracts/src`** and verify the tests fail because the workspace and schemas do not exist.
- [ ] **Step 3: Implement the workspace, shared schemas, strict TypeScript configuration, and Docker Compose services for PostgreSQL and Redis.**
- [ ] **Step 4: Run `pnpm vitest run packages/contracts/src`** and verify all contract tests pass.
- [ ] **Step 5: Commit with `git add . && git commit -m "chore: bootstrap streak monorepo"`**, including the required Copilot co-author trailer.

### Task 2: Implement the streak engine and leaderboard queries

**Files:**
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/domain/streak-engine.ts`
- Create: `apps/api/src/domain/leaderboard.ts`
- Create: `apps/api/src/domain/streak-engine.test.ts`
- Create: `apps/api/src/domain/leaderboard.test.ts`
- Create: `apps/api/src/lib/timezone.ts`

**Interfaces:**
- Consumes `AttendanceWebhook` and a member’s persisted streak state.
- Produces `processAttendance(input: ProcessAttendanceInput): Promise<ProcessAttendanceResult>`, where the result is `{ status: "accepted" | "duplicate"; activeStreak: number; personalBest: number; visitDate: string }`.
- Produces `getLeaderboard(gymId: string, limit?: number): Promise<LeaderboardSnapshot>` with `limit` defaulting to `10` and never exceeding `10`.
- The Prisma model must persist gym timezone, member display name, visit date, active streak, personal best, and a unique `(gymId, memberId, visitDate)` attendance key.

- [ ] **Step 1: Write failing tests** for first visit (`1/1`), consecutive-day increment, missed-day reset preserving personal best, same-day duplicate, midnight conversion using the gym IANA timezone, and deterministic leaderboard ordering by active streak then member name.
- [ ] **Step 2: Run `pnpm vitest run apps/api/src/domain`** and verify the tests fail because the domain functions and Prisma models do not exist.
- [ ] **Step 3: Implement `processAttendance(input: ProcessAttendanceInput)` transactionally: derive the gym-local visit date, insert the unique attendance row, return `duplicate` on the unique conflict, update active/personal-best streak values, and persist the event source timestamp.**
- [ ] **Step 4: Implement `getLeaderboard(gymId, limit)` using only the tenant’s members, ordering by active streak descending and display name ascending, returning at most 10 entries.**
- [ ] **Step 5: Run `pnpm prisma migrate dev --schema apps/api/prisma/schema.prisma` and `pnpm vitest run apps/api/src/domain`; verify migration generation and all domain tests pass.**
- [ ] **Step 6: Commit with `git add apps/api/prisma apps/api/src/domain apps/api/src/lib && git commit -m "feat: add streak calculation engine"`**, including the required Copilot co-author trailer.

### Task 3: Add authenticated, idempotent attendance webhooks

**Files:**
- Create: `apps/api/src/server.ts`
- Create: `apps/api/src/routes/attendance-webhook.ts`
- Create: `apps/api/src/services/device-auth.ts`
- Create: `apps/api/src/routes/attendance-webhook.test.ts`
- Modify: `apps/api/src/domain/streak-engine.ts`

**Interfaces:**
- Exposes `POST /v1/gyms/:gymId/attendance` with JSON `{ member_id: string; timestamp: string; delivery_id: string }`.
- Accepts a device credential in `Authorization: Bearer <credential>`.
- Returns `202 { status: "accepted"; active_streak: number; personal_best: number }` for a new visit and `200 { status: "duplicate"; ... }` for a safe retry/duplicate.
- Returns `401` for invalid/revoked credentials, `400` for invalid payloads, and never invokes the streak engine for either failure.
- Produces a normalized `WelcomeEvent` for accepted new visits only.

- [ ] **Step 1: Write failing route tests** for valid acceptance, malformed payload, invalid credential, revoked credential, repeated `delivery_id`, and same-day duplicate behavior.
- [ ] **Step 2: Run `pnpm vitest run apps/api/src/routes/attendance-webhook.test.ts`** and verify the route tests fail because the Fastify server and route are absent.
- [ ] **Step 3: Implement device credential hashing/lookup and tenant-scoped authorization in `device-auth.ts`; store only credential hashes and revocation timestamps.**
- [ ] **Step 4: Implement the Fastify route with Zod validation, delivery-id idempotency, explicit HTTP status codes, and delegation to `processAttendance`.**
- [ ] **Step 5: Run the targeted route test and `pnpm tsc --noEmit`; verify all cases pass with no type errors.**
- [ ] **Step 6: Commit with `git add apps/api/src && git commit -m "feat: add attendance webhook"`**, including the required Copilot co-author trailer.

### Task 4: Publish welcome events and leaderboard snapshots

**Files:**
- Create: `apps/api/src/realtime/event-bus.ts`
- Create: `apps/api/src/realtime/sse-route.ts`
- Create: `apps/api/src/realtime/event-bus.test.ts`
- Modify: `apps/api/src/routes/attendance-webhook.ts`
- Modify: `apps/api/src/server.ts`

**Interfaces:**
- Produces `publishGymEvent(gymId: string, event: WelcomeEvent | LeaderboardSnapshot): Promise<void>`.
- Produces `subscribeGymEvents(gymId: string): AsyncIterable<WelcomeEvent | LeaderboardSnapshot>`.
- Exposes `GET /v1/gyms/:gymId/events` as an SSE stream with `event: welcome` and `event: leaderboard` frames.
- A successful new attendance publishes one welcome event followed by a refreshed leaderboard snapshot; duplicates publish neither.

- [ ] **Step 1: Write failing tests** for publish/subscribe delivery, tenant isolation, duplicate suppression, SSE event names, and clean subscriber teardown.
- [ ] **Step 2: Run `pnpm vitest run apps/api/src/realtime`** and verify the tests fail because the event bus and SSE route are absent.
- [ ] **Step 3: Implement Redis-backed pub/sub with an in-memory adapter selected for tests; serialize only validated shared contracts.**
- [ ] **Step 4: Wire the webhook route to publish the welcome event and current leaderboard after the transaction commits.**
- [ ] **Step 5: Implement SSE headers, heartbeat messages, disconnect cleanup, and a bounded reconnect-friendly event format.**
- [ ] **Step 6: Run `pnpm vitest run apps/api/src/realtime apps/api/src/routes/attendance-webhook.test.ts`; verify realtime and webhook tests pass.**
- [ ] **Step 7: Commit with `git add apps/api/src && git commit -m "feat: broadcast streak events"`**, including the required Copilot co-author trailer.

### Task 5: Build the kiosk display experience

**Files:**
- Create: `apps/display/src/app/page.tsx`
- Create: `apps/display/src/components/WelcomeCard.tsx`
- Create: `apps/display/src/components/Leaderboard.tsx`
- Create: `apps/display/src/components/DisplayShell.tsx`
- Create: `apps/display/src/lib/useGymEvents.ts`
- Create: `apps/display/src/lib/display-types.ts`
- Create: `apps/display/src/app/globals.css`
- Test: `apps/display/src/**/*.test.tsx`
- Test: `apps/display/e2e/display.spec.ts`

**Interfaces:**
- Consumes the SSE stream at `/v1/gyms/:gymId/events`.
- `useGymEvents(gymId: string)` returns `{ leaderboard: LeaderboardSnapshot | null; welcome: WelcomeEvent | null; connectionState: "connecting" | "open" | "closed" }`.
- `DisplayShell` renders idle leaderboard mode unless a welcome event is active.
- `WelcomeCard` displays `WELCOME BACK, {NAME}! 🔥 {N}-DAY STREAK!`, flame graphics, personal best, and an audio cue, then expires after exactly 5 seconds.

- [ ] **Step 1: Write failing component tests** for idle top-10 rendering, welcome text, personal-best rendering, five-second expiry, reduced-motion fallback, and reconnecting without replaying an expired welcome.
- [ ] **Step 2: Run `pnpm vitest run apps/display/src`** and verify the tests fail because the display components and event hook are absent.
- [ ] **Step 3: Implement the SSE hook with `EventSource`, explicit connection state, cleanup, and a cache of the latest leaderboard only.**
- [ ] **Step 4: Implement `DisplayShell`, `WelcomeCard`, and `Leaderboard` with high-contrast responsive styling for a 4K kiosk; use a timer keyed to `event.occurredAt`/`event.expiresAt`, not render count.**
- [ ] **Step 5: Add Playwright coverage for a configured gym receiving a welcome event, returning to leaderboard after 5 seconds, and reconnecting after the stream closes.**
- [ ] **Step 6: Run `pnpm vitest run apps/display/src && pnpm playwright test apps/display/e2e/display.spec.ts`; verify component and browser tests pass.**
- [ ] **Step 7: Commit with `git add apps/display && git commit -m "feat: add kiosk display experience"`**, including the required Copilot co-author trailer.

### Task 6: Add gym, member, device, and display provisioning

**Files:**
- Create: `apps/api/src/routes/admin.ts`
- Create: `apps/api/src/services/provisioning.ts`
- Create: `apps/api/src/routes/admin.test.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/src/server.ts`

**Interfaces:**
- Exposes authenticated admin operations to create a gym with an IANA timezone, upsert members, issue/revoke device credentials, and create a display configuration.
- Produces `POST /v1/admin/gyms`, `PUT /v1/admin/gyms/:gymId/members/:memberId`, `POST /v1/admin/gyms/:gymId/devices`, `POST /v1/admin/devices/:deviceId/revoke`, and `POST /v1/admin/gyms/:gymId/displays`.
- Display configuration produces `{ gymId, displayId, streamUrl, displayName }`; device creation returns the credential once and never returns it again.

- [ ] **Step 1: Write failing API tests** for tenant-scoped admin access, timezone validation, member upsert, one-time credential issuance, revocation, and display configuration.
- [ ] **Step 2: Run `pnpm vitest run apps/api/src/routes/admin.test.ts`** and verify the tests fail because provisioning endpoints and models are absent.
- [ ] **Step 3: Extend Prisma models and implement provisioning service methods with explicit tenant ownership checks.**
- [ ] **Step 4: Implement the admin routes and a minimal operator authentication boundary; reject unauthenticated or cross-tenant operations with `401`/`403`.**
- [ ] **Step 5: Run targeted API tests, Prisma migration, and `pnpm tsc --noEmit`; verify all pass.**
- [ ] **Step 6: Commit with `git add apps/api && git commit -m "feat: add gym provisioning"`**, including the required Copilot co-author trailer.

### Task 7: Integrate, document, and verify deployment behavior

**Files:**
- Create: `README.md`
- Create: `.env.example`
- Create: `apps/api/src/health.ts`
- Create: `apps/api/src/integration.test.ts`
- Create: `apps/display/.env.example`
- Create: `Dockerfile`
- Create: `docker-compose.test.yml`
- Modify: `apps/api/src/server.ts`
- Modify: `apps/display/src/app/page.tsx`

**Interfaces:**
- `GET /health` reports API, PostgreSQL, and Redis readiness without exposing secrets.
- README documents scanner payload fields, device credential provisioning, gym timezone, display stream URL, HDMI kiosk startup, and the 5-second welcome behavior.
- The integration test boots the API dependencies, posts a webhook, reads the SSE stream, and verifies the leaderboard result.

- [ ] **Step 1: Write the failing end-to-end integration test** covering provisioned gym/member/device, accepted attendance, welcome event, and leaderboard update.
- [ ] **Step 2: Run `pnpm vitest run apps/api/src/integration.test.ts`** and verify the test fails before the health/configuration wiring is complete.
- [ ] **Step 3: Implement health checks, environment parsing, production Docker startup, and graceful shutdown for HTTP, Prisma, and Redis clients.**
- [ ] **Step 4: Implement the integration test harness and README using the exact payload and display semantics from the Global Constraints.**
- [ ] **Step 5: Run `pnpm lint && pnpm tsc --noEmit && pnpm vitest run && pnpm playwright test`; verify the full suite passes.**
- [ ] **Step 6: Commit with `git add . && git commit -m "chore: document and verify streak platform"`**, including the required Copilot co-author trailer.

## Self-Review

- **Spec coverage:** Webhook ingestion and hardware payload are covered by Tasks 2–3; streak rules and personal records by Task 2; realtime transport by Task 4; 5-second welcome/idle leaderboard/4K kiosk behavior by Task 5; commercial multi-gym provisioning by Task 6; operational startup and integration proof by Task 7.
- **Step scan:** Each task follows failing test, failure verification, implementation, passing verification, and commit; signatures and exact values are specified where neighboring tasks depend on them.
- **Type consistency:** Shared event names and payloads originate in `packages/contracts`; API and display tasks consume those same types rather than redefining them.
- **Review focus:** All five identified failure modes are assigned to concrete tests in Tasks 2, 3, and 5.
- **Proportion:** The plan establishes the minimum vertical slice and avoids selecting a billing provider or implementing hardware firmware, neither of which has an API or acceptance behavior in the brief. Subscription billing can be a separate follow-on plan once pricing, tax, invoicing, and payment-provider requirements are specified.
