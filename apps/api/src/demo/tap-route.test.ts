import { describe, expect, it } from "vitest";
import { buildServer } from "../server.js";

describe("demo tap route", () => {
  it("seeds members and accepts a valid tap", async () => {
    const app = buildServer({ demo: true });
    const response = await app.inject({
      method: "POST",
      url: "/demo/tap",
      payload: { member_id: "member-1", timestamp: "2026-11-02T04:30:00.000Z" }
    });
    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({
      status: "accepted",
      member_id: "member-1",
      active_streak: 1
    });
  });

  it("uses a server timestamp when timestamp is omitted", async () => {
    const app = buildServer({ demo: true });
    const response = await app.inject({
      method: "POST",
      url: "/demo/tap",
      payload: { member_id: "member-2" }
    });
    expect(response.statusCode).toBe(202);
    expect(response.json().delivery_id).toEqual(expect.any(String));
  });

  it("rejects unknown demo members", async () => {
    const app = buildServer({ demo: true });
    const response = await app.inject({
      method: "POST",
      url: "/demo/tap",
      payload: { member_id: "unknown" }
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns duplicate for two taps on one local day", async () => {
    const app = buildServer({ demo: true });
    const first = await app.inject({
      method: "POST",
      url: "/demo/tap",
      payload: { member_id: "member-3", timestamp: "2026-11-02T04:30:00.000Z" }
    });
    const second = await app.inject({
      method: "POST",
      url: "/demo/tap",
      payload: { member_id: "member-3", timestamp: "2026-11-02T05:30:00.000Z" }
    });
    expect(first.json().status).toBe("accepted");
    expect(second.statusCode).toBe(200);
    expect(second.json().status).toBe("duplicate");
  });
});
