import { describe, expect, it } from "vitest";
import { OfflineQueue } from "../../../../packages/gateway/src/queue.js";
import { GatewayRuntime } from "../../../../packages/gateway/src/runtime.js";
import { buildServer } from "../server.js";

describe("member management flow", () => {
  it("creates a member, accepts its card tap, and removes it cleanly", async () => {
    const app = buildServer({ demo: true, adminToken: "admin-secret", deviceCredential: "device-secret" });
    const adminHeaders = { authorization: "Bearer admin-secret" };
    const deviceHeaders = { authorization: "Bearer device-secret" };
    const events = app.store.events.subscribeGymEvents("gym-1")[Symbol.asyncIterator]();

    const create = await app.inject({
      method: "POST",
      url: "/v1/gyms/gym-1/members",
      headers: adminHeaders,
      payload: { member_id: "member-4", name: "Priya", card_id: "XYZ789" }
    });
    expect(create.statusCode).toBe(201);
    expect((await app.inject({
      method: "GET",
      url: "/v1/gyms/gym-1/leaderboard"
    })).json().entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ memberId: "member-4", activeStreak: 0, personalBest: 0 })
    ]));

    const queue = new OfflineQueue();
    const gateway = new GatewayRuntime({
      gymId: "gym-1",
      cardMap: app.store.cardMappings.exportMap("gym-1"),
      queue,
      now: () => new Date("2026-11-09T12:00:00.000Z"),
      send: async (event) => {
        const response = await app.inject({
          method: "POST",
          url: "/v1/gyms/gym-1/attendance",
          headers: deviceHeaders,
          payload: event
        });
        return response.json() as { status: "accepted" | "duplicate" };
      }
    });

    expect(await gateway.onReaderLine("xyz789")).toBe(true);
    expect((await events.next()).value).toMatchObject({ type: "welcome", memberId: "member-4" });
    await events.next();

    const updated = (await app.inject({
      method: "GET",
      url: "/v1/gyms/gym-1/leaderboard"
    })).json().entries.find((entry: { memberId: string }) => entry.memberId === "member-4");
    expect(updated).toMatchObject({ activeStreak: 1, personalBest: 1 });

    expect((await app.inject({
      method: "DELETE",
      url: "/v1/gyms/gym-1/members/member-4",
      headers: adminHeaders
    })).statusCode).toBe(200);
    expect(app.store.cardMappings.list("gym-1")).toEqual([]);
    expect((await app.inject({
      method: "GET",
      url: "/v1/gyms/gym-1/leaderboard"
    })).json().entries.some((entry: { memberId: string }) => entry.memberId === "member-4")).toBe(false);
  });
});
