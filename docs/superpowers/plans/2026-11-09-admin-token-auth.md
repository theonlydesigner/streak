# STREAK Admin Token Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect STREAK admin pages and card-mapping APIs with a server-side environment-based admin bearer token while preserving gateway and display behavior.

**Architecture:** Add an admin authorization service separate from `DeviceAuth`. Configure it from `STREAK_ADMIN_TOKEN`, inject it into `ApiStore`, and enforce it in card-mapping routes and admin HTML routes. Admin browser pages will no longer receive or embed credentials; they will use an operator-provided token through a simple local prompt/header mechanism appropriate for the pilot.

**Tech Stack:** TypeScript, Fastify, Vitest, npm, environment variables.

**Spec:** `docs/superpowers/specs/2026-11-09-admin-token-auth-design.md`

## Global Constraints

- Require an admin bearer token for card-mapping API operations.
- Require the same admin token before serving admin mapping and gateway-test pages.
- Read the token from `STREAK_ADMIN_TOKEN`.
- Fail closed when the token is not configured outside demo mode.
- Keep demo mode usable locally with an explicit configured admin token or the existing local demo credential.
- Never embed the production admin token into HTML or JavaScript.
- Preserve gateway device authentication and public display/SSE behavior.
- Do not add hosted login, user accounts, roles, password reset, social sign-in, database migration, or deployment configuration.

## Review Focus

- Missing `STREAK_ADMIN_TOKEN` must reject admin access outside demo mode rather than silently allow it; test a missing-token server.
- Wrong bearer tokens must return `401`; test both API and page requests.
- The production token must not appear in served HTML or JavaScript; test response bodies for the secret.
- Gateway device credentials must remain independent; test a valid device credential against attendance after admin auth is added.
- Public display and SSE routes must remain reachable without admin credentials; test both routes.

---

### Task 1: Add server-side admin authorization

**Files:**
- Create: `apps/api/src/services/admin-auth.ts`
- Modify: `apps/api/src/server.ts`
- Test: `apps/api/src/services/admin-auth.test.ts`

**Interfaces:**
- Consumes: `STREAK_ADMIN_TOKEN` from `process.env` and the existing demo credential option.
- Produces: `AdminAuth` with `authorize(credential: string): boolean`, plus `ApiStore.adminAuth`.

- [ ] **Step 1: Write failing authorization tests**

Add tests proving:

```ts
new AdminAuth("secret").authorize("secret") === true
new AdminAuth("secret").authorize("wrong") === false
new AdminAuth("").authorize("anything") === false
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```powershell
npm test -- apps/api/src/services/admin-auth.test.ts
```

Expected: FAIL because `admin-auth.ts` and `AdminAuth` do not exist.

- [ ] **Step 3: Implement `AdminAuth`**

Create `AdminAuth` with a constructor accepting the configured token and an `authorize` method that returns false for an empty configured token or empty presented credential. Use constant-time comparison if practical without adding a dependency; otherwise keep the comparison isolated so it can be replaced later.

Update `ApiStore` and `buildServer` so `adminAuth` receives `options.adminToken ?? process.env.STREAK_ADMIN_TOKEN ?? (options.demo ? options.deviceCredential ?? "local-demo-only" : "")`.

- [ ] **Step 4: Run the focused test**

Run:

```powershell
npm test -- apps/api/src/services/admin-auth.test.ts
```

Expected: PASS.

### Task 2: Protect admin APIs and pages

**Files:**
- Modify: `apps/api/src/routes/card-mappings.ts`
- Modify: `apps/api/src/demo/mapping-route.ts`
- Modify: `apps/api/src/demo/gateway-test-route.ts`
- Modify: `apps/api/src/demo/gateway-test-page.ts`
- Modify: `apps/api/src/demo/mapping-route.test.ts`
- Modify: `apps/api/src/demo/gateway-test-route.test.ts`
- Add or modify: relevant card-mapping route tests

**Interfaces:**
- Consumes: `store.adminAuth.authorize(credential)` from Task 1.
- Produces: `401` responses for missing or incorrect admin credentials; successful responses only for the correct bearer token.

- [ ] **Step 1: Write failing route tests**

Add tests proving:

1. Mapping API requests without `Authorization: Bearer <admin-token>` return `401`.
2. Mapping API requests with the correct token succeed.
3. Mapping and gateway-test pages reject requests without the correct token.
4. Served admin HTML does not contain the configured admin token.

- [ ] **Step 2: Run the focused route tests and verify they fail**

Run:

```powershell
npm test -- apps/api/src/demo/mapping-route.test.ts apps/api/src/demo/gateway-test-route.test.ts apps/api/src/routes/card-mappings.test.ts
```

Expected: FAIL because current routes use device/demo credentials and pages are served without server-side admin authorization.

- [ ] **Step 3: Apply admin authorization**

Use the existing bearer parsing pattern, but call `store.adminAuth.authorize`. Protect:

- `GET`, `POST`, `PUT`, and `DELETE /v1/gyms/:gymId/card-mappings`
- `GET /admin/mappings`
- `GET /admin/gateway-test`
- Any browser-facing gateway-test endpoint that mutates or exposes admin-only state

Do not pass the admin token into page HTML or JavaScript. The browser pages should show a clear unauthorized response when opened without the required header; the operator can use API commands or a future hosted login for authenticated browser sessions.

- [ ] **Step 4: Run focused route tests**

Run:

```powershell
npm test -- apps/api/src/demo/mapping-route.test.ts apps/api/src/demo/gateway-test-route.test.ts apps/api/src/routes/card-mappings.test.ts
```

Expected: PASS.

### Task 3: Preserve gateway and public display behavior

**Files:**
- Modify: `apps/api/src/routes/attendance-webhook.test.ts`
- Modify: `apps/api/src/demo/display-route.test.ts`
- Modify: `apps/api/src/demo/demo-flow.test.ts`
- Create or modify: `apps/api/src/server-auth-boundaries.test.ts`

**Interfaces:**
- Consumes: `adminAuth` and protected route behavior from Tasks 1 and 2.
- Produces: Regression coverage showing the gateway device token still works and public display/SSE routes remain unauthenticated.

- [ ] **Step 1: Write failing boundary tests**

Add tests proving:

1. A valid device credential still accepts attendance.
2. A request using only the admin token does not impersonate the gateway device.
3. `/display?gym=gym-1` returns `200` without admin credentials.
4. The SSE endpoint remains reachable without admin credentials.

- [ ] **Step 2: Run boundary tests and verify failures**

Run:

```powershell
npm test -- apps/api/src/server-auth-boundaries.test.ts apps/api/src/routes/attendance-webhook.test.ts apps/api/src/demo/display-route.test.ts
```

Expected: FAIL only where the new boundary behavior is not yet implemented or the test setup needs the new configuration.

- [ ] **Step 3: Make only the required wiring changes**

Keep `DeviceAuth` as the sole authorizer for attendance webhook requests. Keep display and SSE routes public. Update demo setup and test fixtures to pass an explicit admin token where admin routes are expected to succeed.

- [ ] **Step 4: Run the boundary tests**

Run:

```powershell
npm test -- apps/api/src/server-auth-boundaries.test.ts apps/api/src/routes/attendance-webhook.test.ts apps/api/src/demo/display-route.test.ts
```

Expected: PASS.

### Task 4: Document pilot authentication setup and run final verification

**Files:**
- Modify: `README.md`
- Modify: `test.md`

**Interfaces:**
- Consumes: Final environment variable and route behavior from Tasks 1–3.
- Produces: Plain-English setup instructions for `STREAK_ADMIN_TOKEN`, explicit demo commands, and verified full project state.

- [ ] **Step 1: Add documentation checks first**

Add or update tests only if the repository has existing documentation tests; otherwise inspect the changed documentation directly. The documentation must state:

- How to set `$env:STREAK_ADMIN_TOKEN` in PowerShell.
- That the token must never be committed.
- That gateway device credentials and admin credentials are separate.
- That display/SSE remain public for the kiosk.

- [ ] **Step 2: Update README and `test.md`**

Add commands such as:

```powershell
$env:STREAK_ADMIN_TOKEN="replace-with-a-long-random-token"
npm run demo
```

Document authenticated API testing with an `Authorization: Bearer` header and explain that browser admin pages require an authenticated request mechanism until hosted login is added.

- [ ] **Step 3: Run the full suite**

Run:

```powershell
npm test
```

Expected: All tests pass.

- [ ] **Step 4: Run TypeScript validation**

Run:

```powershell
npx tsc --noEmit
```

Expected: Exit code `0` with no TypeScript errors.

- [ ] **Step 5: Run an environment-configured smoke test**

Set a temporary admin token in PowerShell, start the demo, and verify:

```powershell
$env:STREAK_ADMIN_TOKEN="streak-pilot-admin-token"
```

Expected: unauthenticated admin API requests return `401`, authenticated mapping requests succeed, the public display loads, and a valid device attendance request still works.

- [ ] **Step 6: Stop the demo and remove only temporary process state**

Stop the demo process and ensure no secret values were written to repository files.
