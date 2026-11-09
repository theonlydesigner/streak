# STREAK Card Mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a validated, JSON-backed admin mapping surface for assigning placeholder or future physical card IDs to gym members and exporting the mapping consumed by the gateway.

**Architecture:** Keep mapping configuration behind a dedicated `CardMappingStore` and Fastify routes. Store mappings in the existing API JSON state file when configured, expose a minimal browser page for local setup, and retain the gateway’s standalone `card-map.json` input as the runtime boundary.

**Tech Stack:** TypeScript, Fastify, Vitest, existing JSON persistence and browser-inline demo assets.

**Spec:** `docs/superpowers/specs/2026-11-04-card-mapping-design.md`

## Global Constraints

- No physical reader or Raspberry Pi validation is claimed.
- Placeholder IDs such as `ABC123` are software fixtures only.
- Card IDs are trimmed and uppercased before storage and lookup.
- One card ID maps to at most one member within a gym.
- A member may have one active card mapping in this pilot.
- Existing attendance, queue, and display behavior must remain green.
- Production admin authentication, external imports, and PostgreSQL administration are out of scope.

## Review Focus

- Whitespace/lowercase card IDs must normalize identically in admin storage, export, and gateway lookup; test normalization at the store boundary.
- A card already assigned to another member must be rejected without mutating either mapping; test duplicate assignment atomically.
- Replacing a member’s card must remove the old card and expose only the new one; test replacement and export.
- Restarting the API must preserve mappings alongside member state; test JSON reload.
- Unknown members and unknown delete targets must return explicit errors rather than silently succeeding; test route responses.

---

### Task 1: Add card-mapping domain store

**Files:**
- Create: `apps/api/src/domain/card-mapping-store.ts`
- Create: `apps/api/src/domain/card-mapping-store.test.ts`
- Modify: `apps/api/src/domain/streak-engine.ts` only if a shared persistence type/helper is required

**Interfaces:**
- Consumes: `StreakStore.get(memberId)` for member validation and the configured gym ID.
- Produces:
  - `type CardMapping = { gymId: string; memberId: string; cardId: string }`
  - `class JsonCardMappingStore`
  - `normalizeCardId(cardId: string): string`
  - `list(gymId: string): CardMapping[]`
  - `assign(gymId: string, memberId: string, cardId: string): CardMapping`
  - `replace(gymId: string, memberId: string, cardId: string): CardMapping`
  - `remove(gymId: string, memberId: string): boolean`
  - `exportMap(gymId: string): Record<string, string>`

- [ ] **Step 1: Write failing tests** for normalization, assignment, duplicate-card rejection, replacement, removal, export, unknown member rejection, and JSON restart persistence.
- [ ] **Step 2: Run the focused test file and verify it fails** because the store is not implemented.
- [ ] **Step 3: Implement the minimal store** with in-memory maps plus optional JSON file persistence; use atomic temporary-file replacement and persist mappings under a versioned `cardMappings` field without overwriting existing member/visit data.
- [ ] **Step 4: Run the focused tests and verify they pass.**
- [ ] **Step 5: Run `npx tsc --noEmit`.**

### Task 2: Wire mapping persistence into the API server

**Files:**
- Modify: `apps/api/src/server.ts`
- Modify: `apps/api/src/demo/main.ts`
- Modify: `apps/api/src/demo/seed.ts` only if member registration typing requires it
- Create or modify: `apps/api/src/services/card-mapping-store.test.ts` only if server wiring needs a focused integration test

**Interfaces:**
- Consumes: `JsonCardMappingStore` from Task 1 and `ApiStore.streaks`.
- Produces: `ApiStore.cardMappings`, initialized with the same configured state path when one exists, otherwise an isolated in-memory store.

- [ ] **Step 1: Write a failing server test** proving `buildServer({ statePath })` exposes a mapping store and that a mapping survives constructing a second server with the same state file.
- [ ] **Step 2: Run the focused test and verify it fails** because `ApiStore.cardMappings` does not exist.
- [ ] **Step 3: Add the store to `ApiStore` and initialize it** without changing the existing attendance state behavior.
- [ ] **Step 4: Run the focused test and the existing API tests.**
- [ ] **Step 5: Run `npx tsc --noEmit`.**

### Task 3: Add validated mapping API routes

**Files:**
- Create: `apps/api/src/routes/card-mappings.ts`
- Create: `apps/api/src/routes/card-mappings.test.ts`
- Modify: `apps/api/src/server.ts`

**Interfaces:**
- Consumes: `ApiStore.cardMappings`, `ApiStore.streaks`, and existing device credential authorization.
- Produces:
  - `GET /v1/gyms/:gymId/card-mappings`
  - `POST /v1/gyms/:gymId/card-mappings` with `{ member_id, card_id }`
  - `PUT /v1/gyms/:gymId/card-mappings/:memberId` with `{ card_id }`
  - `DELETE /v1/gyms/:gymId/card-mappings/:memberId`

- [ ] **Step 1: Write failing route tests** for authenticated list/create/replace/delete, invalid payloads, wrong credentials, unknown members, duplicate cards, and unknown delete targets.
- [ ] **Step 2: Run the focused route tests and verify expected failures.**
- [ ] **Step 3: Implement the routes** using the existing `Bearer` credential convention; return `201` for create, `200` for list/replace/delete, `400` for invalid/unknown members, `409` for duplicate cards, and `401` for unauthorized requests.
- [ ] **Step 4: Register the routes in `buildServer`.**
- [ ] **Step 5: Run focused routes, then `npm test`.**
- [ ] **Step 6: Run `npx tsc --noEmit`.**

### Task 4: Add local admin mapping page and gateway export

**Files:**
- Create: `apps/api/src/demo/mapping-route.ts`
- Create: `apps/api/src/demo/mapping-route.test.ts`
- Modify: `apps/api/src/server.ts`
- Modify: `README.md`
- Create: `card-map.example.json` only if the existing fixture needs to be updated

**Interfaces:**
- Consumes: mapping API behavior from Task 3 and seeded demo members.
- Produces:
  - `GET /admin/mappings?gym=gym-1`
  - A functional page that lists mappings and submits add/replace/remove actions.
  - A displayed/exportable normalized JSON map for gateway configuration.

- [ ] **Step 1: Write failing page tests** verifying the page contains the mapping form, member options, current mappings, placeholder-ID warning, and gateway export instructions.
- [ ] **Step 2: Run the focused page tests and verify failure.**
- [ ] **Step 3: Implement the inline page** using same-origin `fetch` calls and the existing demo credential configuration; keep styling functional and separate from display polish.
- [ ] **Step 4: Register the page only in demo mode.**
- [ ] **Step 5: Update README** with the page URL, placeholder-ID warning, and the exact transition from placeholder IDs to real reader IDs.
- [ ] **Step 6: Run focused page tests and `npm test`.**

### Task 5: Verify the complete software-only flow

**Files:**
- Create: `apps/api/src/demo/card-mapping-flow.test.ts`
- Modify: `README.md` only for verified run instructions

**Interfaces:**
- Consumes: mapping API/page and gateway runtime from prior tasks.
- Produces: a deterministic test proving mapping configuration reaches gateway behavior without physical hardware.

- [ ] **Step 1: Write a failing end-to-end test** that creates `ABC123 -> member-1`, exports the map, feeds `ABC123` into `GatewayRuntime`, and verifies an attendance event is sent; also verifies an unknown card is rejected and a second same-day tap returns the API’s duplicate result.
- [ ] **Step 2: Run the test and verify it fails before the integration wiring is complete.**
- [ ] **Step 3: Implement only the missing integration glue.**
- [ ] **Step 4: Run the end-to-end test, then `npm test`.**
- [ ] **Step 5: Run `npx tsc --noEmit`.**
- [ ] **Step 6: Perform a manual local check with `npm run demo`, `/admin/mappings?gym=gym-1`, and the simulated gateway input; stop the demo process and remove temporary state files afterward.**
