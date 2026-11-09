import type { LeaderboardSnapshot } from "@streak/contracts";
import { InMemoryStreakStore } from "./streak-engine.js";
import type { StreakStore } from "./streak-engine.js";

export { InMemoryStreakStore };

export async function getLeaderboard(
  store: StreakStore,
  gymId: string,
  limit = 10
): Promise<LeaderboardSnapshot> {
  const entries = store.all()
    .filter((member) => member.gymId === gymId)
    .sort((left, right) =>
      right.activeStreak - left.activeStreak ||
      left.memberDisplayName.localeCompare(right.memberDisplayName)
    )
    .slice(0, Math.min(10, Math.max(0, limit)))
    .map((member) => ({
      memberId: member.memberId,
      memberDisplayName: member.memberDisplayName,
      activeStreak: member.activeStreak,
      personalBest: member.personalBest
    }));

  return {
    type: "leaderboard",
    gymId,
    entries,
    generatedAt: new Date().toISOString()
  };
}
