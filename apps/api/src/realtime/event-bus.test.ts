import { describe, expect, it } from "vitest";
import { InMemoryEventBus } from "./event-bus.js";

describe("gym event bus", () => {
  it("delivers events only to subscribers of the same gym", async () => {
    const bus = new InMemoryEventBus();
    const subscriber = bus.subscribeGymEvents("gym-1")[Symbol.asyncIterator]();
    const next = subscriber.next();
    await bus.publishGymEvent("gym-1", {
      type: "welcome",
      gymId: "gym-1",
      memberId: "member-1",
      memberDisplayName: "Rahul",
      activeStreak: 1,
      personalBest: 1,
      occurredAt: "2026-11-02T04:30:00.000Z",
      expiresAt: "2026-11-02T04:30:05.000Z"
    });
    const result = await next;
    expect(result.value).toMatchObject({ type: "welcome", gymId: "gym-1" });
  });
});
