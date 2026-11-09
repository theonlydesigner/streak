# STREAK Member Management

## Intent

Extend the admin area so a gym operator can create and manage the members shown on the leaderboard, while assigning each member a card ID for the future reader.

## Goals

- Add a member using:
  - Member ID
  - Member name
  - Card ID
- Require all three fields when creating a member.
- Start new members with a `0-day` active streak and `0` personal best.
- Show new members on the leaderboard immediately.
- Allow editing a member name and replacing their card.
- Allow removing a member and its card mapping.
- Prevent duplicate member IDs and duplicate card IDs.
- Keep admin-token protection on all member and mapping operations.
- Preserve existing seeded demo members and attendance behavior.

## User flow

The admin page will contain a member-management section and the existing mapping list:

```text
Member ID: member-4
Name: Priya
Card ID: XYZ789
            [Add member]
```

After saving, Priya appears on the leaderboard with zero streak values. When `XYZ789` is tapped through the gateway flow, Priya receives the welcome card and her streak becomes `1`.

## Non-goals

- No automatic sync with gym membership software yet.
- No hosted login changes.
- No changes to streak calculations or gateway queueing.
- No physical hardware claims.

## Approach

Reuse the existing streak store for member records and the existing card-mapping store for card assignments. Add authenticated member CRUD routes and update the admin page to call those routes. Member creation will validate the member exists before assigning the card, persist the member and mapping together where JSON persistence is enabled, and reject duplicate IDs or cards.

## Verification

- Creating a valid member adds it to the leaderboard.
- Creating a member with a duplicate ID or card returns a clear error.
- Updating a name or card works.
- Removing a member removes its card mapping and excludes it from the leaderboard.
- Tapping the new member’s card produces an accepted attendance and welcome event.
- Existing Rahul, Ananya, and Vikram flows remain green.
