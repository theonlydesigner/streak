import { describe, expect, it } from "vitest";
import { buildServer } from "../server.js";

describe("gateway test route", () => {
  it("reports accepted, duplicate, and unknown cards", async () => {
    const app = buildServer({ demo: true, adminToken: "admin-secret", deviceCredential: "device-secret" });
    const headers = { authorization: "Bearer admin-secret" };
    await app.inject({
      method: "POST",
      url: "/v1/gyms/gym-1/card-mappings",
      headers,
      payload: { member_id: "member-1", card_id: "ABC123" }
    });

    const tap = () => app.inject({
      method: "POST",
      url: "/demo/gateway-tap",
      headers,
      payload: { card_id: "abc123" }
    });
    expect((await tap()).json()).toMatchObject({ status: "accepted", member_id: "member-1" });
    expect((await tap()).json()).toMatchObject({ status: "duplicate" });
    expect((await app.inject({
      method: "POST",
      url: "/demo/gateway-tap",
      headers,
      payload: { card_id: "UNKNOWN" }
    })).json()).toMatchObject({ status: "unknown-card" });
  });

  it("reports queued-for-retry when delivery fails", async () => {
    const app = buildServer({
      demo: true,
      adminToken: "admin-secret",
      deviceCredential: "device-secret",
      gatewaySend: async () => { throw new Error("offline"); }
    });
    const headers = { authorization: "Bearer admin-secret" };
    await app.inject({
      method: "POST",
      url: "/v1/gyms/gym-1/card-mappings",
      headers,
      payload: { member_id: "member-1", card_id: "ABC123" }
    });

    const response = await app.inject({
      method: "POST",
      url: "/demo/gateway-tap",
      headers,
      payload: { card_id: "ABC123" }
    });
    expect(response.json()).toMatchObject({ status: "queued-for-retry", queue_size: 1 });
    expect((await app.inject({ method: "GET", url: "/demo/gateway-status", headers })).json()).toMatchObject({ queue_size: 1 });
  });

  it("rejects non-string card ids with a client error", async () => {
    const app = buildServer({ demo: true, adminToken: "admin-secret", deviceCredential: "device-secret" });
    const response = await app.inject({
      method: "POST",
      url: "/demo/gateway-tap",
      headers: { authorization: "Bearer admin-secret" },
      payload: { card_id: 123 }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "card_id is required" });
  });
});
