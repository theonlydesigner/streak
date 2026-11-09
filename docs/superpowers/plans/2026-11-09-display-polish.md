# STREAK Display Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the STREAK kiosk display presentation-ready for a distant 1080p/4K viewer without changing attendance or SSE behavior.

**Architecture:** Keep the existing inline display route and client event flow. Replace only the shell CSS and rendering markup, with small helpers for safe welcome/leaderboard rendering and an empty state. All assets remain local and dependency-free.

**Tech Stack:** TypeScript, Fastify, Vitest, inline browser JavaScript/CSS.

**Spec:** `docs/superpowers/specs/2026-11-09-display-polish-design.md`

## Global Constraints

- Preserve the current SSE welcome and leaderboard event payloads.
- Preserve the five-second welcome expiry behavior.
- Preserve HTML escaping for member names.
- Do not add external fonts, images, audio, or runtime dependencies.
- No physical screen validation is claimed.
- Keep the page runnable with `npm run demo`.

## Review Focus

- An empty leaderboard must show a useful waiting state rather than a blank screen; test the empty-state marker.
- Long or malicious member names must remain escaped and visually contained; test escaped rendering markers.
- A welcome event must not permanently hide the leaderboard after expiry; test the expiry timer path.
- Missing or delayed initial leaderboard data must still render a stable shell; test initial fallback rendering.
- The display must remain readable at narrow and wide viewport sizes; test responsive CSS markers and manual browser verification.

---

### Task 1: Refine display rendering and visual system

**Files:**
- Modify: `apps/api/src/demo/display-route.ts`
- Modify: `apps/api/src/demo/display-route.test.ts`

**Interfaces:**
- Consumes: Existing `welcome` and `leaderboard` SSE payloads and initial leaderboard fetch.
- Produces: Updated `/display` shell and `/display/client.js` with idle leaderboard, welcome card, empty state, responsive CSS, and safe escaped content.

- [ ] **Step 1: Write failing display tests** for branded shell markers, visible `ACTIVE STREAK`/`PERSONAL BEST` labels, empty-state text, responsive layout markers, and welcome rendering markers.
- [ ] **Step 2: Run `npm test -- apps/api/src/demo/display-route.test.ts` and verify the new assertions fail.**
- [ ] **Step 3: Implement the visual update** in the inline shell/client: dark broadcast-style background, amber flame accent, rank treatment, large streak values, compact personal-best metadata, dimmed welcome backdrop, and `Waiting for first check-in` empty state.
- [ ] **Step 4: Preserve the existing timer, SSE listeners, initial fetch, and `escapeHtml` behavior.**
- [ ] **Step 5: Run the focused display tests and verify they pass.**

### Task 2: Verify the polished display end-to-end

**Files:**
- Modify: `README.md` if run instructions need updated display notes
- Create: `apps/api/src/demo/display-polish-flow.test.ts`

**Interfaces:**
- Consumes: Updated display route from Task 1 and existing `/demo/tap`.
- Produces: Deterministic proof that seeded leaderboard, welcome event, and post-welcome idle rendering remain available.

- [ ] **Step 1: Write the failing flow test** for display HTML, seeded leaderboard content, welcome event path, and empty-state marker.
- [ ] **Step 2: Run it and verify expected failure before implementation is complete.**
- [ ] **Step 3: Add only missing integration glue, if required.**
- [ ] **Step 4: Run `npm test` and `npx tsc --noEmit`.**
- [ ] **Step 5: Start `npm run demo`, manually open `/display?gym=gym-1`, trigger `/demo/tap`, verify the welcome card and return to leaderboard, then stop the process and remove temporary files.**
