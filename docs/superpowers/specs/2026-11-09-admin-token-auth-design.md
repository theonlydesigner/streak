# STREAK Admin Token Authentication

## Intent

Replace the demo-only browser credential injection with a server-side admin token suitable for the pilot deployment. The existing gateway device credential remains separate because gateway webhooks and gym-owner administration are different trust boundaries.

## Goals

- Require an admin bearer token for card-mapping API operations.
- Require the same admin token before serving admin mapping and gateway-test pages.
- Read the token from `STREAK_ADMIN_TOKEN`.
- Fail closed when the token is not configured outside demo mode.
- Keep demo mode usable locally with an explicit configured admin token or the existing local demo credential.
- Never embed the production admin token into HTML or JavaScript.
- Preserve gateway device authentication and public display/SSE behavior.

## Non-goals

- No hosted login, user accounts, roles, password reset, or social sign-in.
- No change to attendance webhook authentication.
- No database migration or deployment configuration in this change.

## Approach

Add a small server-side admin authorization helper to `ApiStore`, configure it from `STREAK_ADMIN_TOKEN`, and apply it to admin pages and card-mapping routes. Browser admin pages will stop receiving a credential value from the server; the pilot operator will provide the bearer token through a controlled local/deployment mechanism. Existing demo behavior may use the local demo credential only when explicitly running in demo mode.

## Verification

- Unauthenticated admin page/API requests return `401`.
- Correct admin token allows admin page/API access.
- Incorrect tokens remain rejected.
- Gateway device credentials still authorize attendance webhooks.
- Display and SSE routes remain available without admin authentication.
- Existing full tests and TypeScript validation pass.
