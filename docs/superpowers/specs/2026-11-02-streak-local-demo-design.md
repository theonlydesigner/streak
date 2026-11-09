# STREAK Local Demo Design

## Intent

Provide a one-command local demo that makes the current STREAK vertical slice visible in a browser without RFID hardware, PostgreSQL, Redis, or a Raspberry Pi.

## Goals

- Start one Node process that serves both the demo API and display page.
- Open a browser at `/display?gym=gym-1`.
- Simulate a keyfob tap through `POST /demo/tap`.
- Show the tap’s authoritative streak result on the display through the real SSE event path.
- Seed a small set of members so the idle leaderboard is meaningful.
- Keep demo state isolated from production configuration and clearly label the simulator.

## Non-goals

- Replacing the physical gateway or USB reader.
- Simulating production authentication, billing, or multi-gym administration.
- Adding PostgreSQL, Redis, or external services for local preview.

## Selected approach

Use one Node/Fastify process. It will register the existing health, attendance, and SSE routes, add a demo tap route that uses the configured demo credential, and serve the display HTML/JavaScript from the existing display assets. The demo page will connect to the same `/v1/gyms/:gymId/events` SSE endpoint used by the planned kiosk client.

The demo tap route accepts a member ID and optional timestamp, creates a unique delivery ID, submits the event through the normal attendance route, and returns the API response. Seed data will use predictable member IDs and names. The display will show a visible “DEMO MODE” label so screenshots and manual testing cannot be mistaken for a production deployment.

## Run experience

```powershell
npm run demo
```

Then open `http://localhost:3001/display?gym=gym-1` and tap a member using:

```powershell
Invoke-RestMethod -Method Post `
  -Uri http://localhost:3001/demo/tap `
  -ContentType 'application/json' `
  -Body '{"member_id":"member-1"}'
```

Success means the display receives a welcome event, shows it for five seconds, and returns to the seeded leaderboard.

## Remaining builder calls

- Use port `3001` to avoid assuming a frontend dev server.
- Use `tsx` to run the TypeScript entry point directly.
- Use the existing in-memory stores; no persistence is required for the local demo.
