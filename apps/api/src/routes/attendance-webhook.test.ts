import { describe, expect, it } from "vitest";
import { buildServer } from "../server.js";

describe("attendance webhook", () => {
  it("accepts an authenticated attendance and returns the streak", async () => {
    const app = buildServer({ deviceCredential: "device-secret" });
    const response = await app.inject({
      method: "POST",
      url: "/v1/gyms/gym-1/attendance",
      headers: { authorization: "Bearer device-secret" },
      payload: {
        member_id: "member-1",
        timestamp: "2026-11-02T04:30:00.000Z",
        delivery_id: "delivery-1"
      }
    });
    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({ status: "accepted", active_streak: 1 });
  });

  it("rejects invalid credentials without mutating attendance", async () => {
    const app = buildServer({ deviceCredential: "device-secret" });
    const response = await app.inject({
      method: "POST",
      url: "/v1/gyms/gym-1/attendance",
      headers: { authorization: "Bearer wrong" },
      payload: {
        member_id: "member-1",
        timestamp: "2026-11-02T04:30:00.000Z",
        delivery_id: "delivery-1"
      }
    });
    expect(response.statusCode).toBe(401);
    expect(app.store.attendanceCount()).toBe(0);
  });

  it("returns duplicate for a repeated delivery id", async () => {
    const app = buildServer({ deviceCredential: "device-secret" });
    const payload = {
      member_id: "member-1",
      timestamp: "2026-11-02T04:30:00.000Z",
      delivery_id: "delivery-1"
    };
    await app.inject({
      method: "POST",
      url: "/v1/gyms/gym-1/attendance",
      headers: { authorization: "Bearer device-secret" },
      payload
    });
    const response = await app.inject({
      method: "POST",
      url: "/v1/gyms/gym-1/attendance",
      headers: { authorization: "Bearer device-secret" },
      payload
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe("duplicate");
    expect(app.store.attendanceCount()).toBe(1);
  });

  it("does not reprocess a delivery id with a changed timestamp", async () => {
    const app = buildServer({ deviceCredential: "device-secret" });
    await app.inject({
      method: "POST",
      url: "/v1/gyms/gym-1/attendance",
      headers: { authorization: "Bearer device-secret" },
      payload: {
        member_id: "member-1",
        timestamp: "2026-11-02T04:30:00.000Z",
        delivery_id: "delivery-1"
      }
    });
    const response = await app.inject({
      method: "POST",
      url: "/v1/gyms/gym-1/attendance",
      headers: { authorization: "Bearer device-secret" },
      payload: {
        member_id: "member-1",
        timestamp: "2026-11-04T04:30:00.000Z",
        delivery_id: "delivery-1"
      }
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe("duplicate");
    expect(app.store.attendanceCount()).toBe(1);
  });

  it("publishes a welcome and refreshed leaderboard after acceptance", async () => {
    const app = buildServer({ deviceCredential: "device-secret" });
    const iterator = app.store.events.subscribeGymEvents("gym-1")[Symbol.asyncIterator]();
    const welcome = iterator.next();
    const leaderboard = iterator.next();
    await app.inject({
      method: "POST",
      url: "/v1/gyms/gym-1/attendance",
      headers: { authorization: "Bearer device-secret" },
      payload: {
        member_id: "member-1",
        timestamp: "2026-11-02T04:30:00.000Z",
        delivery_id: "delivery-1"
      }
    });
    expect((await welcome).value).toMatchObject({ type: "welcome" });
    expect((await leaderboard).value).toMatchObject({ type: "leaderboard" });
  });
});
