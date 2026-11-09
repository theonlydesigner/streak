# STREAK Card Mapping Design

## Intent

Give the software a clear way to associate placeholder or future physical keyfob IDs with gym members before hardware is available. The result must make the gateway demoable today and make replacing placeholder IDs with real reader IDs straightforward later.

## Goals

- Add a gym-scoped member/card mapping API.
- Support creating, updating, listing, and removing mappings.
- Normalize card IDs consistently with the gateway.
- Reject duplicate card assignments and unknown member IDs.
- Persist mappings in a local JSON store for the pilot.
- Let the gateway load the same mapping from an exported JSON file.
- Add a small browser admin page for local demonstration.

## Non-goals

- Physical reader testing or claiming hardware validation.
- Authentication/authorization for a production admin console.
- Member import from external gym software.
- PostgreSQL schema or multi-gym production administration.

## Approaches

1. **Local JSON-backed admin API and page (selected):** fastest path that fits the current JSON pilot persistence and lets placeholder IDs be managed before hardware arrives. The gateway can use an exported mapping file.
2. **Database-backed admin module:** more production-ready, but premature while the API state is still a pilot JSON store and would consume the remaining delivery time.
3. **Manual editing only:** smallest implementation, but error-prone and does not provide validation or a usable demonstration.

## Behavior

- A member must already exist in the selected gym.
- Card IDs are trimmed and uppercased before storage and lookup.
- One card ID maps to at most one member within a gym.
- A member may have one active card mapping in this pilot.
- Replacing a member's card removes the previous mapping.
- Removing a member does not silently remove their attendance history.
- The admin page shows current mappings and provides add/replace/remove controls.
- The gateway remains the attendance runtime; the admin surface only manages configuration.

## Proposed endpoints

- `GET /v1/gyms/:gymId/card-mappings`
- `POST /v1/gyms/:gymId/card-mappings`
- `PUT /v1/gyms/:gymId/card-mappings/:memberId`
- `DELETE /v1/gyms/:gymId/card-mappings/:memberId`
- `GET /admin/mappings?gym=gym-1`

The API uses the existing local device credential for the pilot. Production admin authentication is deferred.

## Persistence and export

Mappings are stored in the configured JSON state file, alongside member state, using a versioned top-level field. The gateway can also read a standalone exported `card-map.json`; export is a deterministic object of normalized card ID to member ID.

## Verification

Tests will cover normalization, unknown members, duplicate cards, replacement, deletion, persistence across API restart, export compatibility, and the browser page's basic rendering. Existing attendance, queue, and display tests must remain green.

## Builder decisions

- Use the current Fastify route style and TypeScript contracts.
- Keep the page intentionally functional rather than visually polished.
- Use placeholder IDs such as `ABC123` only as demo fixtures, clearly labeled as non-hardware data.
