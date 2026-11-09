# STREAK Display Palette and Final Test Guide

## Intent

Apply the approved visual palette from the reference image to the existing STREAK display without changing attendance, SSE, or hardware-boundary behavior. Add a plain-English `test.md` runbook so the final software-only check is repeatable before authentication and deployment.

## Goals

- Use CSS variables for the approved colors:
  - Background: `#000000`
  - Row panels: `#141414`
  - Accent 1: `#F58821`
  - Accent 2: `#E4501A`
  - Rank 1: `#FFB866`
  - Secondary text: `#C8C8C8`
  - Text on orange: `#0A0A0A`
- Preserve the current display hierarchy, welcome card, empty state, responsive layout, SSE flow, five-second expiry, and safe escaping.
- Document the final local verification steps in `test.md`, including exact Windows commands and expected results.

## Non-goals

- No authentication or deployment work.
- No changes to streak calculations, gateway behavior, API contracts, or hardware claims.
- No new dependencies or external assets.

## Approach

Use named CSS variables in the inline display shell and map existing visual roles to the approved palette. Keep the current layout and rendering logic intact, changing only color tokens and closely related contrast choices. Add a concise test guide covering install, automated tests, type-checking, demo startup, display verification, simulated tap verification, duplicate behavior, unknown-card behavior, and cleanup.

## Verification

- Existing display tests and a palette-marker assertion pass.
- Full `npm test` passes.
- `npx tsc --noEmit` passes.
- A live demo smoke test confirms `/display?gym=gym-1` loads and `/demo/tap` returns an accepted result.
- `test.md` gives the user a final manual checklist with no physical-hardware claims.
