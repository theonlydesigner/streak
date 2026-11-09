# STREAK Display Palette and Final Test Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved display palette and create a plain-English final verification guide before authentication and deployment.

**Architecture:** Keep the existing inline display route and browser event flow unchanged. Add named CSS variables for the supplied palette, map the current visual roles to those tokens, and add a repository-root `test.md` containing repeatable Windows commands and manual checks.

**Tech Stack:** TypeScript, Fastify, inline HTML/CSS/JavaScript, Vitest, npm.

**Spec:** `docs/superpowers/specs/2026-11-09-display-palette-and-test-guide-design.md`

## Global Constraints

- Background: `#000000`
- Row panels: `#141414`
- Accent 1: `#F58821`
- Accent 2: `#E4501A`
- Rank 1: `#FFB866`
- Secondary text: `#C8C8C8`
- Text on orange: `#0A0A0A`
- Preserve SSE welcome and leaderboard payloads.
- Preserve the five-second welcome expiry and HTML escaping.
- Do not add dependencies, external assets, authentication, deployment, or physical hardware claims.

## Review Focus

- A palette token must be used by the rendered shell rather than only declared and unused; test each required hex marker in the served HTML.
- The welcome state must retain readable dark text on orange accents; test the text-on-orange token marker.
- Narrow-screen CSS must remain present after the palette edit; test the responsive marker.
- The test guide must use Windows-compatible commands and state expected outcomes; inspect the document for `npm test`, `npx tsc --noEmit`, and demo URLs.
- The final guide must distinguish software simulation from physical hardware validation; test the document for explicit software-only wording.

---

### Task 1: Apply the approved display palette

**Files:**
- Modify: `apps/api/src/demo/display-route.ts`
- Modify: `apps/api/src/demo/display-route.test.ts`

**Interfaces:**
- Consumes: Existing inline display shell, welcome/leaderboard client rendering, SSE listeners, and responsive CSS.
- Produces: Served display HTML with CSS variables `--color-bg`, `--color-panel`, `--color-accent-1`, `--color-accent-2`, `--color-rank-1`, `--color-secondary-text`, and `--color-on-orange`, each mapped to the exact approved hex value.

- [ ] **Step 1: Write the failing palette assertions**

Add a test named `serves the approved display palette` that requests `/display?gym=gym-1` and asserts the response contains all seven exact hex values and the responsive marker `@media (max-width: 700px)`.

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```powershell
npm test -- apps/api/src/demo/display-route.test.ts
```

Expected: FAIL because the current display shell does not contain the approved palette values.

- [ ] **Step 3: Implement the CSS variable palette**

In the `:root` rule of `apps/api/src/demo/display-route.ts`, define the seven named variables with the exact values from the spec. Replace existing background, panel, accent, rank-one, secondary-text, and orange-text color literals in the display CSS with the matching variables. Preserve layout, rendering markup, SSE behavior, expiry timing, and escaping.

- [ ] **Step 4: Run the focused tests**

Run:

```powershell
npm test -- apps/api/src/demo/display-route.test.ts
```

Expected: PASS with all display route tests passing.

### Task 2: Create the final plain-English test guide

**Files:**
- Create: `test.md`

**Interfaces:**
- Consumes: Existing npm scripts (`npm test`, `npx tsc --noEmit`, `npm run demo`), display route `/display?gym=gym-1`, simulated tap route `/demo/tap`, and gateway console `/admin/gateway-test?gym=gym-1`.
- Produces: A user-facing final verification runbook with exact PowerShell commands, expected results, manual browser checks, cleanup instructions, and an explicit software-only/hardware-not-yet-tested boundary.

- [ ] **Step 1: Write `test.md`**

Include these sections in plain English:

1. What this final check proves.
2. Start in `C:\Users\Pratham\Desktop\Streak`.
3. Install/restore dependencies with `npm install`.
4. Automated verification with `npm test` and `npx tsc --noEmit`.
5. Start the demo with `npm run demo`.
6. Open `/display?gym=gym-1`, `/admin/mappings?gym=gym-1`, and `/admin/gateway-test?gym=gym-1`.
7. Test a valid simulated tap using PowerShell:

```powershell
Invoke-WebRequest -UseBasicParsing -Method Post -ContentType 'application/json' -Body '{"member_id":"member-1"}' http://localhost:3001/demo/tap
```

8. Explain expected accepted, duplicate, and unknown-card behavior.
9. Explain that physical reader, Raspberry Pi, HDMI display, network recovery, and real keyfobs are not validated yet.
10. Stop the demo process and report the final pass/fail checklist.

- [ ] **Step 2: Inspect the guide for required commands and boundaries**

Run:

```powershell
$guide = Get-Content .\test.md -Raw
if ($guide -notmatch 'npm test' -or
    $guide -notmatch 'npx tsc --noEmit' -or
    $guide -notmatch 'http://localhost:3001/display\?gym=gym-1' -or
    $guide -notmatch 'software-only' -or
    $guide -notmatch 'physical') {
  throw 'test.md is missing a required verification instruction'
}
Write-Output 'test.md contains the required final verification instructions.'
```

Expected: The command prints the success message.

### Task 3: Run the final verification

**Files:**
- Verify: `apps/api/src/demo/display-route.ts`
- Verify: `apps/api/src/demo/display-route.test.ts`
- Verify: `test.md`

**Interfaces:**
- Consumes: Tasks 1 and 2.
- Produces: Verified final software state ready for the user’s last manual check before authentication and deployment.

- [ ] **Step 1: Run the full test suite**

Run:

```powershell
npm test
```

Expected: All test files and tests pass.

- [ ] **Step 2: Run TypeScript validation**

Run:

```powershell
npx tsc --noEmit
```

Expected: Exit code `0` with no TypeScript errors.

- [ ] **Step 3: Run the live HTTP smoke test**

Start the demo:

```powershell
npm run demo
```

In a second PowerShell window:

```powershell
$display = Invoke-WebRequest -UseBasicParsing http://localhost:3001/display?gym=gym-1
if ($display.StatusCode -ne 200) { throw 'Display did not load' }
$tap = Invoke-WebRequest -UseBasicParsing -Method Post -ContentType 'application/json' -Body '{"member_id":"member-1"}' http://localhost:3001/demo/tap
if ($tap.StatusCode -ne 202) { throw 'Simulated tap was not accepted' }
Write-Output 'Display loaded and simulated tap was accepted.'
```

Expected: The command prints the success message; the browser shows the welcome card and then returns to the leaderboard after approximately five seconds.

- [ ] **Step 4: Stop the demo and use `test.md` for the final manual check**

Stop only the demo process, then follow the checklist in `test.md`. Do not claim physical hardware validation.
