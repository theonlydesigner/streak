import { describe, expect, it } from "vitest";
import { InMemoryStreakStore, processAttendance } from "./streak-engine.js";

const event = (timestamp: string, delivery_id: string) => ({
  member_id: "member-1",
  timestamp,
  delivery_id
});

describe("streak engine", () => {
  it("registers, renames, and removes members", () => {
    const store = new InMemoryStreakStore({ gymId: "gym-1", timezone: "Asia/Kolkata" });
    store.registerMember({
      gymId: "gym-1",
      memberId: "member-4",
      memberDisplayName: "Priya",
      activeStreak: 0,
      personalBest: 0
    });

    expect(store.get("member-4")).toMatchObject({
      memberId: "member-4",
      memberDisplayName: "Priya",
      activeStreak: 0,
      personalBest: 0
    });

    expect(store.updateMember("member-4", { memberDisplayName: "Priya Sharma" })).toMatchObject({
      memberDisplayName: "Priya Sharma",
      activeStreak: 0,
      personalBest: 0
    });
    expect(store.removeMember("member-4")).toBe(true);
    expect(store.get("member-4")).toBeUndefined();
  });

  it("rejects duplicate member IDs", () => {
    const store = new InMemoryStreakStore({ gymId: "gym-1", timezone: "Asia/Kolkata" });
    const member = {
      gymId: "gym-1",
      memberId: "member-4",
      memberDisplayName: "Priya",
      activeStreak: 0,
      personalBest: 0
    };
    store.registerMember(member);
    expect(() => store.registerMember(member)).toThrow("member already exists");
  });

  it("clears visits when a member is removed and re-added", async () => {
    const store = new InMemoryStreakStore({ gymId: "gym-1", timezone: "Asia/Kolkata" });
    store.registerMember({
      gymId: "gym-1",
      memberId: "member-4",
      memberDisplayName: "Priya",
      activeStreak: 0,
      personalBest: 0
    });
    await processAttendance(store, {
      ...event("2026-11-01T04:30:00.000Z", "d1"),
      member_id: "member-4"
    });
    store.removeMember("member-4");
    store.registerMember({
      gymId: "gym-1",
      memberId: "member-4",
      memberDisplayName: "Priya",
      activeStreak: 0,
      personalBest: 0
    });

    expect(await processAttendance(store, {
      ...event("2026-11-01T04:30:00.000Z", "d2"),
      member_id: "member-4"
    })).toMatchObject({
      status: "accepted",
      activeStreak: 1
    });
  });

  it("starts, increments, and resets while preserving personal best", async () => {
    const store = new InMemoryStreakStore({ gymId: "gym-1", timezone: "Asia/Kolkata" });
    expect(await processAttendance(store, event("2026-11-01T04:30:00.000Z", "d1"))).toMatchObject({
      status: "accepted", activeStreak: 1, personalBest: 1, visitDate: "2026-11-01"
    });
    expect(await processAttendance(store, event("2026-11-02T04:30:00.000Z", "d2"))).toMatchObject({
      activeStreak: 2, personalBest: 2
    });
    expect(await processAttendance(store, event("2026-11-04T04:30:00.000Z", "d3"))).toMatchObject({
      activeStreak: 1, personalBest: 2
    });
  });

  it("deduplicates the same member on the same local calendar day", async () => {
    const store = new InMemoryStreakStore({ gymId: "gym-1", timezone: "Asia/Kolkata" });
    await processAttendance(store, event("2026-11-01T17:00:00.000Z", "d1"));
    expect(await processAttendance(store, event("2026-11-01T18:00:00.000Z", "d2"))).toMatchObject({
      status: "duplicate", activeStreak: 1
    });
  });

  it("uses the gym timezone at midnight boundaries", async () => {
    const store = new InMemoryStreakStore({ gymId: "gym-1", timezone: "Asia/Kolkata" });
    const result = await processAttendance(store, event("2026-11-01T18:31:00.000Z", "d1"));
    expect(result.visitDate).toBe("2026-11-02");
  });
});
