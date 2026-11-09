import { describe, expect, it } from "vitest";
import { buildServer } from "../server.js";

describe("gateway test flow", () => {
  it("covers known, unknown, duplicate, and offline-queued states", async () => {
    const app = buildServer({
      demo: true,
      adminToken: "admin-secret",
      deviceCredential: "flow-secret",
      gatewaySend: async () => ({ status: "accepted" })
    });
    const headers = { authorization: "Bearer admin-secret" };
    await app.inject({
      method: "POST",
      url: "/v1/gyms/gym-1/card-mappings",
      headers,
      payload: { member_id: "member-1", card_id: "ABC123" }
    });

    expect((await app.inject({ method: "POST", url: "/demo/gateway-tap", headers, payload: { card_id: "ABC123" } })).json()).toMatchObject({ status: "accepted" });
    expect((await app.inject({ method: "POST", url: "/demo/gateway-tap", headers, payload: { card_id: "NOPE" } })).json()).toMatchObject({ status: "unknown-card" });

    const offline = buildServer({
      demo: true,
      adminToken: "offline-admin",
      deviceCredential: "offline-secret",
      gatewaySend: async () => { throw new Error("offline"); }
    });
    const offlineHeaders = { authorization: "Bearer offline-admin" };
    await offline.inject({
      method: "POST",
      url: "/v1/gyms/gym-1/card-mappings",
      headers: offlineHeaders,
      payload: { member_id: "member-1", card_id: "ABC123" }
    });
    expect((await offline.inject({ method: "POST", url: "/demo/gateway-tap", headers: offlineHeaders, payload: { card_id: "ABC123" } })).json()).toMatchObject({ status: "queued-for-retry", queue_size: 1 });
  });
});
