# Gateway Test Console Design

## Intent

Provide a browser-based software console for exercising the same card-to-member and API delivery path that the future USB reader will use, without requiring hardware.

## Goals

- Accept a typed placeholder card ID.
- Use the current card mapping configuration.
- Send the tap through `GatewayRuntime`, not a separate simulation path.
- Show clear results for accepted, duplicate, unknown-card, and delivery-failure states.
- Show the current durable queue size.
- Provide repeatable offline/online verification instructions.

## Non-goals

- Physical reader or Raspberry Pi validation.
- Replacing the gateway process.
- Production admin authentication or remote operations.
- Simulating hardware electrical behavior.

## Approach

Add a demo-only `/admin/gateway-test` page and a small demo endpoint that invokes the same gateway runtime with an API sender. The page will use the existing demo credential and card mappings, while the endpoint will expose explicit result states and queue size. This is preferred over adding simulation logic to the display or `/demo/tap`, because it keeps the hardware boundary honest and testable.

## Behavior

- Known mapped card: submit through `GatewayRuntime`, then show accepted or duplicate based on the API response.
- Unknown card: show `unknown-card` without creating a queue item.
- Failed API delivery: retain the queue item and show `queued-for-retry`.
- The page refreshes queue status after each attempt.
- The page labels all IDs as software fixtures until real hardware is available.

## Verification

Tests cover known cards, unknown cards, duplicate same-day taps, failed delivery retention, page rendering, and full regression.
