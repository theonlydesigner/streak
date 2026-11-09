import { describe, expect, it } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JsonStreakStore, processAttendance } from "./streak-engine.js";

describe("persistent streak store", () => {
  it("persists member lifecycle changes", async () => {
    const directory = await mkdtemp(join(tmpdir(), "streak-member-"));
    const file = join(directory, "state.json");
    const first = new JsonStreakStore({ gymId: "gym-1", timezone: "Asia/Kolkata" }, file);

    first.registerMember({
      gymId: "gym-1",
      memberId: "member-4",
      memberDisplayName: "Priya",
      activeStreak: 0,
      personalBest: 0
    });
    first.updateMember("member-4", { memberDisplayName: "Priya Sharma" });

    const restarted = new JsonStreakStore({ gymId: "gym-1", timezone: "Asia/Kolkata" }, file);
    expect(restarted.get("member-4")).toMatchObject({ memberDisplayName: "Priya Sharma", activeStreak: 0 });

    expect(restarted.removeMember("member-4")).toBe(true);
    const afterRemoval = new JsonStreakStore({ gymId: "gym-1", timezone: "Asia/Kolkata" }, file);
    expect(afterRemoval.get("member-4")).toBeUndefined();
  });

  it("restores member streaks and same-day visits after an API restart", async () => {
    const directory = await mkdtemp(join(tmpdir(), "streak-api-"));
    const file = join(directory, "state.json");
    const first = new JsonStreakStore({ gymId: "gym-1", timezone: "Asia/Kolkata" }, file);

    await processAttendance(first, {
      member_id: "member-1",
      timestamp: "2026-11-04T04:30:00.000Z",
      delivery_id: "delivery-1"
    });

    const restarted = new JsonStreakStore({ gymId: "gym-1", timezone: "Asia/Kolkata" }, file);
    expect(restarted.get("member-1")).toMatchObject({ activeStreak: 1, personalBest: 1 });
    await expect(processAttendance(restarted, {
      member_id: "member-1",
      timestamp: "2026-11-04T05:30:00.000Z",
      delivery_id: "delivery-2"
    })).resolves.toMatchObject({ status: "duplicate" });
  });
});
