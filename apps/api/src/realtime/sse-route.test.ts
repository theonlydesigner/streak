import { describe, expect, it } from "vitest";
import { formatSseEvent } from "./sse-route.js";

describe("SSE events", () => {
  it("formats named events as SSE frames", () => {
    expect(formatSseEvent({
      type: "welcome",
      gymId: "gym-1",
      memberId: "member-1",
      memberDisplayName: "Rahul",
      activeStreak: 1,
      personalBest: 1,
      occurredAt: "2026-11-02T04:30:00.000Z",
      expiresAt: "2026-11-02T04:30:05.000Z",
      sourceTimestamp: "2026-11-02T04:29:00.000Z"
    })).toContain("event: welcome");
  });
});
