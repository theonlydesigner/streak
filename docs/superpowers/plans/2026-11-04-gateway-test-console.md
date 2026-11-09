# Gateway Test Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a demo-only browser console that exercises the real gateway runtime and clearly shows accepted, duplicate, unknown-card, and offline-queued outcomes.

**Architecture:** Add a small demo endpoint that owns an `OfflineQueue` and `GatewayRuntime` configured with the current card mappings and an API sender. Add an inline admin page that submits card IDs to that endpoint and renders the returned status and queue size. No new production path or hardware assumptions are introduced.

**Tech Stack:** TypeScript, Fastify, Vitest, existing gateway queue/runtime, inline browser JavaScript.

**Spec:** `docs/superpowers/specs/2026-11-04-gateway-test-console-design.md`

## Global Constraints

- The console is demo-only.
- It must use `GatewayRuntime`, not a separate fake attendance implementation.
- Placeholder IDs are software fixtures until real hardware is available.
- Unknown cards must not create queue items.
- Failed API delivery must leave the event queued for retry.
- No physical reader or Raspberry Pi validation is claimed.

## Review Focus

- A card mapping added after the server starts must be reflected by the test endpoint; test mapping lookup per request or an explicit refresh.
- API duplicate responses must be shown as duplicate, not as success; test a same-day repeat.
- Network failure must preserve the queue and expose `queued-for-retry`; test with a sender that throws.
- Malformed or blank card input must be rejected without a queue item; test whitespace and empty input.
- The page must surface non-2xx errors instead of showing a false success; test endpoint error responses and browser text.

---

### Task 1: Add gateway test endpoint

**Files:**
- Create: `apps/api/src/demo/gateway-test-route.ts`
- Create: `apps/api/src/demo/gateway-test-route.test.ts`
- Modify: `apps/api/src/server.ts`

**Interfaces:**
- Consumes: `ApiStore.cardMappings`, `ApiStore.auth`, `OfflineQueue`, and `GatewayRuntime`.
- Produces:
  - `POST /demo/gateway-tap` with `{ card_id: string }`
  - `GET /demo/gateway-status`
  - Result states: `accepted`, `duplicate`, `unknown-card`, `queued-for-retry`

- [ ] **Step 1: Write failing tests** for accepted mapped cards, unknown/blank cards, duplicate same-day taps, failed delivery retention, queue status, and custom demo credentials.
- [ ] **Step 2: Run `npm test -- apps/api/src/demo/gateway-test-route.test.ts` and verify failure because the routes do not exist.**
- [ ] **Step 3: Implement the endpoint** using a queue path derived from `STREAK_GATEWAY_QUEUE_PATH` or a temporary in-memory queue when unset; create the runtime with the current exported card map for each tap request.
- [ ] **Step 4: Register the routes only when `demo: true`.**
- [ ] **Step 5: Run the focused tests and verify they pass.**

### Task 2: Add Gateway Test Console page

**Files:**
- Create: `apps/api/src/demo/gateway-test-page.ts`
- Create: `apps/api/src/demo/gateway-test-page.test.ts`
- Modify: `apps/api/src/server.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: Task 1 endpoints.
- Produces: `GET /admin/gateway-test?gym=gym-1`, with a form for card IDs, result status, queue count, and offline/hardware-fixture guidance.

- [ ] **Step 1: Write failing page tests** for the page title, card input, status area, queue status, endpoint paths, and explicit software-fixture wording.
- [ ] **Step 2: Run the focused test and verify failure.**
- [ ] **Step 3: Implement the inline page** using the configured demo credential, displaying endpoint errors and returned statuses.
- [ ] **Step 4: Register the page only in demo mode and document the verification sequence.**
- [ ] **Step 5: Run focused page tests and the complete test suite.**

### Task 3: Verify software-only reader flow

**Files:**
- Create: `apps/api/src/demo/gateway-test-flow.test.ts`
- Modify: `README.md` if any verified commands need clarification

**Interfaces:**
- Consumes: Task 1 endpoint and Task 2 page.
- Produces: deterministic verification covering mapped card, unknown card, duplicate, and offline queue retention.

- [ ] **Step 1: Write the failing flow test** for `ABC123`, an unknown ID, a same-day repeat, and a sender failure.
- [ ] **Step 2: Run it and verify expected failure.**
- [ ] **Step 3: Add only missing integration glue.**
- [ ] **Step 4: Run `npm test` and `npx tsc --noEmit`.**
- [ ] **Step 5: Start `npm run demo`, manually open `/admin/gateway-test?gym=gym-1`, try `ABC123` and `UNKNOWN`, then stop the process and remove temporary queue/state files.**
