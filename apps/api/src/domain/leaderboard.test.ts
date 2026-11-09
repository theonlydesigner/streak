import { describe, expect, it } from "vitest";
import { InMemoryStreakStore, getLeaderboard } from "./leaderboard.js";

describe("leaderboard", () => {
  it("orders by active streak then display name and caps at ten", async () => {
    const store = new InMemoryStreakStore();
    for (let index = 0; index < 12; index += 1) {
      store.set({
        gymId: "gym-1",
        memberId: `member-${index}`,
        memberDisplayName: index === 0 ? "Zed" : `Member ${index}`,
        activeStreak: index === 0 ? 5 : 6,
        personalBest: 10
      });
    }
    const result = await getLeaderboard(store, "gym-1", 50);
    expect(result.entries).toHaveLength(10);
    expect(result.entries[0].memberDisplayName).toBe("Member 1");
    expect(result.entries.some((entry) => entry.memberDisplayName === "Zed")).toBe(false);
  });
});
