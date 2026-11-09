# STREAK Display Polish Design

## Intent

Make the kiosk display look like a convincing commercial gym entrance screen while preserving the existing welcome-event and leaderboard behavior.

## Goals

- Improve visual hierarchy for a 1080p/4K wall display viewed from a distance.
- Make the welcome card immediately readable: member name, active streak, and personal best.
- Make the idle leaderboard feel broadcast-like and easy to scan.
- Preserve the current SSE flow, five-second welcome timing, HTML escaping, and initial leaderboard fetch.
- Keep the display demo-only and hardware-independent.

## Non-goals

- Changing streak calculations or attendance behavior.
- Adding external image, font, or audio dependencies.
- Replacing the current inline demo display architecture.
- Claiming physical screen validation.

## Approach

Update the inline display shell and client rendering in `apps/api/src/demo/display-route.ts`, reusing the existing event payloads. Use CSS gradients, responsive sizing, rank badges, streak emphasis, and a subtle transition state. Keep all assets local and text-based so the page remains runnable with `npm run demo` and on a future Raspberry Pi kiosk.

## Behavior

- Idle state shows STREAK branding, a top-10 leaderboard, active streak as the primary number, and personal best as secondary metadata.
- Welcome state dims the leaderboard and shows the member name in uppercase, a large flame/streak treatment, and personal best.
- Welcome state expires after the existing five-second event deadline, with a client timer only as a rendering fallback.
- Empty leaderboard renders a useful “Waiting for first check-in” state.
- Long member names remain escaped and fit without breaking the layout.

## Verification

Tests will cover the updated display shell markers, welcome/leaderboard rendering behavior, empty state, long-name escaping, and the complete existing test suite. Manual verification will use `/display?gym=gym-1` and `/demo/tap`.
