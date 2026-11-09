import { describe, expect, it } from "vitest";
import { buildServer } from "../server.js";

describe("polished display flow", () => {
  it("keeps the seeded idle board and welcome event path available", async () => {
    const app = buildServer({ demo: true });
    const events = app.store.events.subscribeGymEvents("gym-1")[Symbol.asyncIterator]();

    const display = await app.inject({ method: "GET", url: "/display?gym=gym-1" });
    expect(display.statusCode).toBe(200);
    expect(display.body).toContain("data-display-mode=\"broadcast\"");
    expect(display.body).toContain("Waiting for first check-in");

    const leaderboard = await app.inject({
      method: "GET",
      url: "/v1/gyms/gym-1/leaderboard"
    });
    expect(leaderboard.json().entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ memberDisplayName: "Rahul" })
    ]));

    const tap = await app.inject({
      method: "POST",
      url: "/demo/tap",
      payload: { member_id: "member-1" }
    });
    expect(tap.statusCode).toBe(202);
    expect(tap.json()).toMatchObject({ status: "accepted", member_id: "member-1" });
    expect((await events.next()).value).toMatchObject({
      type: "welcome",
      memberId: "member-1"
    });
  });
});
