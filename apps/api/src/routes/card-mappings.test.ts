import { describe, expect, it } from "vitest";
import { buildServer } from "../server.js";

describe("card mapping routes", () => {
  it("creates, lists, replaces, and deletes mappings", async () => {
    const app = buildServer({ demo: true, adminToken: "admin-secret", deviceCredential: "device-secret" });
    const headers = { authorization: "Bearer admin-secret" };

    expect((await app.inject({
      method: "POST",
      url: "/v1/gyms/gym-1/card-mappings",
      headers,
      payload: { member_id: "member-1", card_id: " abc123 " }
    })).statusCode).toBe(201);

    expect((await app.inject({
      method: "GET",
      url: "/v1/gyms/gym-1/card-mappings",
      headers
    })).json()).toMatchObject({ mappings: [{ card_id: "ABC123", member_id: "member-1" }] });

    expect((await app.inject({
      method: "PUT",
      url: "/v1/gyms/gym-1/card-mappings/member-1",
      headers,
      payload: { card_id: "def456" }
    })).json()).toMatchObject({ card_id: "DEF456" });

    expect((await app.inject({
      method: "DELETE",
      url: "/v1/gyms/gym-1/card-mappings/member-1",
      headers
    })).statusCode).toBe(200);
  });

  it("rejects unknown members and duplicate cards", async () => {
    const app = buildServer({ demo: true, adminToken: "admin-secret", deviceCredential: "device-secret" });
    const headers = { authorization: "Bearer admin-secret" };
    const create = (member_id: string, card_id: string) => app.inject({
      method: "POST",
      url: "/v1/gyms/gym-1/card-mappings",
      headers,
      payload: { member_id, card_id }
    });

    expect((await create("missing", "ABC123")).statusCode).toBe(400);
    expect((await create("member-1", "ABC123")).statusCode).toBe(201);
    expect((await create("member-2", "ABC123")).statusCode).toBe(409);
  });

  it("rejects missing or incorrect admin credentials", async () => {
    const app = buildServer({ demo: true, adminToken: "admin-secret" });
    expect((await app.inject({
      method: "GET",
      url: "/v1/gyms/gym-1/card-mappings"
    })).statusCode).toBe(401);
    expect((await app.inject({
      method: "GET",
      url: "/v1/gyms/gym-1/card-mappings",
      headers: { authorization: "Bearer wrong" }
    })).statusCode).toBe(401);
  });
});
