# STREAK Member Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add authenticated admin member management so operators can create, edit, and remove members while assigning each member a card ID.

**Architecture:** Extend the existing `StreakStore` lifecycle with member creation, update, and removal while preserving JSON persistence. Add a dedicated authenticated member API and compose it with the existing `CardMappingStore`; update the existing admin mappings page to manage members and cards through those APIs.

**Tech Stack:** TypeScript, Fastify, Vitest, JSON/in-memory stores, inline admin HTML/JavaScript.

**Spec:** `docs/superpowers/specs/2026-11-09-member-management-design.md`

## Global Constraints

- Require `Member ID`, member name, and `Card ID` when creating a member.
- Start new members with a `0-day` active streak and `0` personal best.
- Keep admin-token protection on all member and mapping operations.
- Preserve existing seeded demo members and attendance behavior.
- No automatic sync with gym membership software yet.
- No hosted login changes.
- No changes to streak calculations or gateway queueing.
- No physical hardware claims.

## Review Focus

- Duplicate member IDs must return a clear conflict without changing existing data; test in the member route suite.
- Duplicate card IDs and card IDs differing only by case/whitespace must be rejected; test in the member route and mapping suites.
- A failed card assignment must not leave a half-created member; test the create-member route.
- Removing a member must remove its card mapping and exclude it from the leaderboard; test the member-management flow.
- Unauthorized member API and admin-page requests must return `401` without exposing member data; test route and page boundaries.

---

### Task 1: Add member lifecycle operations to the streak stores

**Files:**
- Modify: `apps/api/src/domain/streak-engine.ts`
- Test: `apps/api/src/domain/streak-engine.test.ts`
- Test: `apps/api/src/domain/persistent-streak-store.test.ts`

**Interfaces:**
- Consumes: Existing `MemberState`, `StreakStore`, and JSON extension persistence.
- Produces:
  - `StreakStore.registerMember(member: Omit<MemberState, "lastVisitDate">): void`
  - `StreakStore.updateMember(memberId: string, patch: { memberDisplayName: string }): MemberState`
  - `StreakStore.removeMember(memberId: string): boolean`

- [ ] **Step 1: Write failing lifecycle tests**

Add tests proving that a new member can be registered with `activeStreak: 0` and `personalBest: 0`, renamed without changing streak fields, and removed from `get()`/`all()`.

Add JSON-store coverage proving registration, rename, and removal survive a new store instance.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npm test -- apps/api/src/domain/streak-engine.test.ts apps/api/src/domain/persistent-streak-store.test.ts`

Expected: FAIL because the lifecycle methods are not yet part of the store interface.

- [ ] **Step 3: Implement lifecycle methods**

Add the three methods to `StreakStore` and both store implementations. Reject duplicate IDs in `registerMember` with `member already exists`; reject missing members in `updateMember` with `member not found`; remove the member’s stored visit keys when removing it so re-adding the same ID cannot inherit stale same-day deduplication.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- apps/api/src/domain/streak-engine.test.ts apps/api/src/domain/persistent-streak-store.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/domain/streak-engine.ts apps/api/src/domain/streak-engine.test.ts apps/api/src/domain/persistent-streak-store.test.ts
git commit -m "feat: add member lifecycle operations"
```

### Task 2: Add authenticated member CRUD routes

**Files:**
- Create: `apps/api/src/routes/members.ts`
- Create: `apps/api/src/routes/members.test.ts`
- Modify: `apps/api/src/server.ts`
- Modify: `apps/api/src/domain/card-mapping-store.ts`

**Interfaces:**
- Consumes: `ApiStore.adminAuth`, `ApiStore.streaks`, `ApiStore.cardMappings`, and `normalizeCardId`.
- Produces:
  - `GET /v1/gyms/:gymId/members`
  - `POST /v1/gyms/:gymId/members` with `{ member_id: string; name: string; card_id: string }`
  - `PUT /v1/gyms/:gymId/members/:memberId` with `{ name: string; card_id: string }`
  - `DELETE /v1/gyms/:gymId/members/:memberId`

- [ ] **Step 1: Write failing API tests**

Test authenticated list/create/update/delete, creation with zero streak values, leaderboard visibility after creation, duplicate member/card conflicts, validation of all required fields, rollback when card assignment cannot be completed, and unauthorized access.

- [ ] **Step 2: Run the route tests and verify failure**

Run: `npm test -- apps/api/src/routes/members.test.ts`

Expected: FAIL because the route file and registrations do not exist.

- [ ] **Step 3: Implement the member routes**

Use the existing admin authorization pattern and response naming (`member_id`, `name`, `card_id`, `active_streak`, `personal_best`). Normalize card IDs before checking or assigning them. For creation, validate the ID, name, gym, and card availability before registering the member; assign the mapping only after registration succeeds, and remove the member if the assignment unexpectedly fails. For updates, change the name and replace the card mapping while preserving streak state. For deletion, remove the mapping first and then remove the member.

- [ ] **Step 4: Register routes and add card availability support**

Register `registerMemberRoutes` in `buildServer`. Add the smallest read-only availability helper needed in `CardMappingStore` so member creation can preflight a normalized card without exposing internal maps.

- [ ] **Step 5: Run route and regression tests**

Run: `npm test -- apps/api/src/routes/members.test.ts apps/api/src/routes/card-mappings.test.ts apps/api/src/server-auth-boundaries.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/members.ts apps/api/src/routes/members.test.ts apps/api/src/server.ts apps/api/src/domain/card-mapping-store.ts
git commit -m "feat: add authenticated member management API"
```

### Task 3: Add member management to the admin page

**Files:**
- Modify: `apps/api/src/demo/mapping-route.ts`
- Modify: `apps/api/src/demo/mapping-route.test.ts`

**Interfaces:**
- Consumes: `GET/POST/PUT/DELETE /v1/gyms/:gymId/members` and existing card-mapping endpoints.
- Produces: An admin page with required `Member ID`, `Name`, and `Card ID` fields, member list, edit controls, card replacement, and removal controls.

- [ ] **Step 1: Write failing page tests**

Assert that the page contains member-management labels, required fields, member API URLs, edit/remove controls, and the existing placeholder-hardware guidance. Preserve the existing checks that the admin token is not embedded and dynamic values use safe DOM APIs/text content.

- [ ] **Step 2: Run the page tests and verify failure**

Run: `npm test -- apps/api/src/demo/mapping-route.test.ts`

Expected: FAIL because the current page only renders card mapping controls.

- [ ] **Step 3: Implement the page controls**

Add a member form that requires all three values and posts to the member API. Render members with current streak, personal best, and card ID. Use DOM construction and `textContent` for server/API data. Add edit behavior for name/card and a removal confirmation; reload members and mappings after each successful operation and show API errors plainly.

- [ ] **Step 4: Run page and display regressions**

Run: `npm test -- apps/api/src/demo/mapping-route.test.ts apps/api/src/demo/display-route.test.ts apps/api/src/demo/card-mapping-flow.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/demo/mapping-route.ts apps/api/src/demo/mapping-route.test.ts
git commit -m "feat: add member management to admin page"
```

### Task 4: Verify the complete new-member attendance flow

**Files:**
- Create or modify: `apps/api/src/demo/member-management-flow.test.ts`
- Modify: `README.md`
- Modify: `test.md`

**Interfaces:**
- Consumes: Admin member API, card mapping export, gateway runtime, attendance webhook, leaderboard events, and existing demo display.
- Produces: End-to-end proof and plain-English instructions for adding a real demo member.

- [ ] **Step 1: Write the failing end-to-end test**

Create a member with `member-4`, `Priya`, and `XYZ789`; assert zero initial values, verify it appears in the leaderboard, send `XYZ789` through `GatewayRuntime`, assert accepted attendance and a welcome event, then remove the member and assert its mapping and leaderboard entry are gone.

- [ ] **Step 2: Run the flow test and verify failure**

Run: `npm test -- apps/api/src/demo/member-management-flow.test.ts`

Expected: FAIL until the API and page-backed flow is complete.

- [ ] **Step 3: Add user-facing verification instructions**

Document the admin URL, required fields, expected zero-state, card tap test, duplicate-card behavior, and removal behavior. Keep the hardware limitation explicit: the gateway test console simulates the future reader.

- [ ] **Step 4: Run the complete validation**

Run: `npm test`

Expected: all tests pass, including the existing Rahul, Ananya, and Vikram flows.

Run: `npm run typecheck`

Expected: TypeScript exits successfully with no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/demo/member-management-flow.test.ts README.md test.md
git commit -m "test: verify complete member management flow"
```
