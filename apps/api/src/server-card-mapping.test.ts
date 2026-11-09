import { describe, expect, it } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildServer } from "./server.js";

describe("server card mapping persistence", () => {
  it("uses a companion mapping file across API restarts", async () => {
    const directory = await mkdtemp(join(tmpdir(), "streak-server-"));
    const statePath = join(directory, "state.json");
    const first = buildServer({ statePath });
    first.store.streaks.set({
      gymId: "gym-1",
      memberId: "member-1",
      memberDisplayName: "Rahul",
      activeStreak: 1,
      personalBest: 1
    });
    first.store.cardMappings.assign("gym-1", "member-1", "ABC123");

    const restarted = buildServer({ statePath });
    expect(restarted.store.cardMappings.exportMap("gym-1")).toEqual({ ABC123: "member-1" });
  });
});
