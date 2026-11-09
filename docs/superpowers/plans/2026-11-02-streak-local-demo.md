# STREAK Local Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-command local demo that serves the STREAK display, simulates keyfob taps, and visibly exercises the real webhook, streak, SSE, and five-second welcome flow.

**Architecture:** Extend the existing Fastify API with a demo-only server entry point that registers the current health, attendance, and SSE routes, adds a seeded in-memory gym/member setup, and exposes `POST /demo/tap`. Serve the existing display assets from the same process so the browser uses the same SSE endpoint as the kiosk path. Keep demo state in memory and isolate the demo credential and route from production deployment.

**Tech Stack:** TypeScript, Fastify, Node HTTP/static serving, existing Zod contracts, Vitest, npm scripts.

**Spec:** `docs/superpowers/specs/2026-11-02-streak-local-demo-design.md`

## Global Constraints

- Start one Node process that serves both the demo API and display page.
- Use port `3001` to avoid assuming a frontend dev server.
- Open the display at `/display?gym=gym-1`.
- Simulate a keyfob tap through `POST /demo/tap`.
- Use the existing in-memory stores; no persistence is required for the local demo.
- The demo page must visibly identify `DEMO MODE`.
- A successful simulated tap must use the normal attendance route and SSE event path.
- The welcome card must remain visible for five seconds, then return to the seeded leaderboard.
- Demo credentials and routes must not be presented as production authentication or provisioning.

## Review Focus

- A malformed or unknown demo member must return a clear `400` response and must not mutate streak state; test in Task 1.
- A demo tap with an omitted timestamp must use a deterministic server timestamp while preserving the normal attendance contract; test in Task 1.
- Two rapid taps for the same member must result in one accepted event and one duplicate response; test in Task 1.
- A browser loading `/display?gym=gym-1` must receive the SSE stream from the same process rather than a hard-coded external origin; test in Task 2.
- A welcome event received near expiry must not remain visible beyond five real seconds; test in Task 2.

---

### Task 1: Add demo seed data and tap simulation

**Files:**
- Create: `apps/api/src/demo/seed.ts`
- Create: `apps/api/src/demo/tap-route.ts`
- Create: `apps/api/src/demo/tap-route.test.ts`
- Modify: `apps/api/src/server.ts`
- Modify: `apps/api/src/domain/streak-engine.ts`

**Interfaces:**
- Produces `DemoMember { memberId: string; memberDisplayName: string; activeStreak: number; personalBest: number }`.
- Produces `seedDemoMembers(store: InMemoryStreakStore): void` with at least `member-1`/`Rahul`, `member-2`/`Ananya`, and `member-3`/`Vikram`.
- Produces `POST /demo/tap` with JSON `{ member_id: string; timestamp?: string }`.
- Returns `{ status: "accepted" | "duplicate"; member_id: string; active_streak: number; personal_best: number; delivery_id: string }`.
- Uses a generated unique `delivery_id` and delegates through the existing `POST /v1/gyms/:gymId/attendance` route with the demo device credential.
- Produces a server factory option `demo?: boolean` so the demo route is not registered by default in production server construction.

- [ ] **Step 1: Write failing tests** for seeded members appearing in the leaderboard, a valid demo tap returning `202`/`accepted`, an omitted timestamp being accepted with a valid ISO timestamp, an unknown member returning `400`, and two taps on one local day returning accepted then duplicate.
- [ ] **Step 2: Run `npx vitest run apps/api/src/demo/tap-route.test.ts`** and verify failure because the demo seed and route do not exist.
- [ ] **Step 3: Add `seedDemoMembers(store: InMemoryStreakStore): void` and extend the in-memory store with an explicit member-registration operation that does not create an attendance visit.**
- [ ] **Step 4: Implement `registerDemoTapRoute(app, store)` to validate input, reject unknown members, fill `timestamp` with `new Date().toISOString()` when omitted, generate a delivery ID, and invoke the existing attendance handler path using the demo credential.**
- [ ] **Step 5: Register the demo route only when `buildServer({ demo: true })` is requested and seed the demo members before requests are handled.**
- [ ] **Step 6: Run `npx vitest run apps/api/src/demo/tap-route.test.ts apps/api/src/domain apps/api/src/routes/attendance-webhook.test.ts`; verify all targeted tests pass.**
- [ ] **Step 7: Commit with `git add apps/api/src && git commit -m "feat: add demo tap simulator"`**, including the required Copilot co-author trailer when Git is available.

### Task 2: Serve the browser display from the demo process

**Files:**
- Create: `apps/api/src/demo/display-route.ts`
- Create: `apps/api/src/demo/display-route.test.ts`
- Modify: `apps/display/src/index.html`
- Modify: `apps/display/src/client.ts`
- Modify: `apps/display/src/display-state.ts`
- Modify: `apps/api/src/server.ts`

**Interfaces:**
- Exposes `GET /display?gym=gym-1` with the display HTML.
- Serves the browser module dependencies at `/display/client.js` and `/display/display-state.js`, or bundles them into a single browser-compatible asset.
- Uses the current request origin for `/v1/gyms/:gymId/events`; no fixed API host is embedded in the display.
- Renders a visible `DEMO MODE` label only when the page is opened with the demo route.
- Preserves `DisplayState`, `renderLeaderboard`, and `renderWelcome` behavior and uses the existing five-second event expiry fields.

- [ ] **Step 1: Write failing tests** for `GET /display` returning HTML, the HTML containing `DEMO MODE`, same-origin SSE URL construction, and a welcome event expiring at five seconds.
- [ ] **Step 2: Run `npx vitest run apps/api/src/demo/display-route.test.ts apps/display/src/display-state.test.ts`** and verify failure because the display route and browser-serving path do not exist.
- [ ] **Step 3: Implement `registerDemoDisplayRoute(app)` to return the display shell and serve browser-compatible display code from the same origin; do not expose source-only `.ts` imports to the browser.**
- [ ] **Step 4: Update the display page/client to render the demo label, use `window.location.origin` for SSE, and reconnect with the existing two-second retry behavior.**
- [ ] **Step 5: Run `npx vitest run apps/api/src/demo/display-route.test.ts apps/display/src/display-state.test.ts`; verify display route and expiry tests pass.**
- [ ] **Step 6: Commit with `git add apps/api/src/demo apps/api/src/server.ts apps/display/src && git commit -m "feat: serve local demo display"`**, including the required Copilot co-author trailer when Git is available.

### Task 3: Add the one-command launcher and manual demo verification

**Files:**
- Create: `apps/api/src/demo/main.ts`
- Create: `apps/api/src/demo/demo-flow.test.ts`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `apps/display/src/index.html`

**Interfaces:**
- Adds `npm run demo`, running the demo server on `http://localhost:3001`.
- `GET /health` remains available.
- `GET /display?gym=gym-1` loads the seeded leaderboard.
- `POST /demo/tap` triggers the welcome card and leaderboard update.
- The README contains exact PowerShell commands for starting the demo, opening the page, simulating a tap, and stopping the process.

- [ ] **Step 1: Write the failing integration test** that starts the demo app, verifies health and display responses, posts a demo tap for `member-1`, and observes welcome plus leaderboard events for `gym-1`.
- [ ] **Step 2: Run `npx vitest run apps/api/src/demo/demo-flow.test.ts`** and verify failure because the launcher and demo-only route registration are absent.
- [ ] **Step 3: Implement `apps/api/src/demo/main.ts` to call `buildServer({ demo: true })`, listen on port `3001`, and log only the local URLs and non-sensitive demo instructions.**
- [ ] **Step 4: Add the `demo` npm script using `tsx` and add `tsx` as a development dependency; keep `npm test` and `npm run typecheck` unchanged.**
- [ ] **Step 5: Update README with the exact flow: `npm install`, `npm run demo`, browse to `http://localhost:3001/display?gym=gym-1`, then call `Invoke-RestMethod` against `/demo/tap`.**
- [ ] **Step 6: Run `npm install`, `npx vitest run`, and `npm run typecheck`; verify the full suite passes and no demo credential is logged or committed.**
- [ ] **Step 7: Start `npm run demo`, verify `GET /health`, `GET /display?gym=gym-1`, and one `POST /demo/tap` manually, then stop the process.**
- [ ] **Step 8: Commit with `git add package.json package-lock.json README.md apps/api/src/demo apps/display/src && git commit -m "feat: add one-command local demo"`**, including the required Copilot co-author trailer when Git is available.

## Self-Review

- **Spec coverage:** One-process server, port 3001, display URL, demo tap route, seeded members, SSE reuse, demo labeling, and no persistence are covered by Tasks 1–3.
- **Step scan:** Each task follows failing tests, expected failure, minimal implementation, targeted verification, and commit; browser-serving details are explicit because the current display imports TypeScript modules that cannot be sent directly to a browser.
- **Type consistency:** The demo route consumes the existing attendance contract and server factory; the display consumes the existing SSE event names and expiry fields.
- **Review focus:** All five identified failure modes are assigned to concrete tests in Tasks 1–2.
- **Proportion:** The plan adds only the local demo launcher and serving layer; it does not introduce production persistence, authentication, deployment, or hardware changes.
