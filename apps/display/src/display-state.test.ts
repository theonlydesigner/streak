import { describe, expect, it } from "vitest";
import { DisplayState, renderLeaderboard, renderWelcome } from "./display-state.js";

describe("display state", () => {
  it("renders the top ten leaderboard with personal bests", () => {
    const state = new DisplayState();
    state.setLeaderboard({
      type: "leaderboard",
      gymId: "gym-1",
      generatedAt: "2026-11-02T04:30:00.000Z",
      entries: [{
        memberId: "member-1",
        memberDisplayName: "Rahul",
        activeStreak: 12,
        personalBest: 20
      }]
    });
    expect(renderLeaderboard(state.leaderboard)).toContain("Rahul");
    expect(renderLeaderboard(state.leaderboard)).toContain("Best: 20");
  });

  it("shows a welcome only until its five-second expiry", () => {
    const state = new DisplayState();
    state.setWelcome({
      type: "welcome",
      gymId: "gym-1",
      memberId: "member-1",
      memberDisplayName: "Rahul",
      activeStreak: 12,
      personalBest: 20,
      occurredAt: "2026-11-02T04:30:00.000Z",
      expiresAt: "2026-11-02T04:30:05.000Z"
    });
    expect(renderWelcome(state.welcome, new Date("2026-11-02T04:30:04.000Z"))).toContain("WELCOME BACK, RAHUL!");
    expect(renderWelcome(state.welcome, new Date("2026-11-02T04:30:05.001Z"))).toBe("");
  });
});
