import { describe, expect, it } from "vitest";
import {
  AttendanceWebhookSchema,
  LeaderboardSnapshotSchema,
  WelcomeEventSchema
} from "./index.js";

describe("shared contracts", () => {
  it("parses a valid attendance webhook", () => {
    expect(
      AttendanceWebhookSchema.parse({
        member_id: "member-1",
        timestamp: "2026-11-02T04:30:00.000Z",
        delivery_id: "delivery-1"
      })
    ).toEqual({
      member_id: "member-1",
      timestamp: "2026-11-02T04:30:00.000Z",
      delivery_id: "delivery-1"
    });
  });

  it("rejects a webhook without member_id or timestamp", () => {
    expect(() => AttendanceWebhookSchema.parse({ delivery_id: "delivery-1" })).toThrow();
  });

  it("validates a five-second welcome event", () => {
    const event = WelcomeEventSchema.parse({
      type: "welcome",
      gymId: "gym-1",
      memberId: "member-1",
      memberDisplayName: "Rahul",
      activeStreak: 12,
      personalBest: 20,
      occurredAt: "2026-11-02T04:30:00.000Z",
      expiresAt: "2026-11-02T04:30:05.000Z"
    });
    expect(event.expiresAt).toBe("2026-11-02T04:30:05.000Z");
  });

  it("caps leaderboard entries at ten", () => {
    const entries = Array.from({ length: 10 }, (_, index) => ({
      memberId: `member-${index}`,
      memberDisplayName: `Member ${index}`,
      activeStreak: 10 - index,
      personalBest: 10
    }));
    expect(LeaderboardSnapshotSchema.parse({
      gymId: "gym-1",
      entries,
      generatedAt: "2026-11-02T04:30:00.000Z"
    }).entries).toHaveLength(10);
    expect(() => LeaderboardSnapshotSchema.parse({
      gymId: "gym-1",
      entries: [...entries, entries[0]],
      generatedAt: "2026-11-02T04:30:00.000Z"
    })).toThrow();
  });
});
