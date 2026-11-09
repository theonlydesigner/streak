import { describe, expect, it } from "vitest";
import { OfflineQueue } from "../../../../packages/gateway/src/queue.js";
import { GatewayRuntime } from "../../../../packages/gateway/src/runtime.js";
import { buildServer } from "../server.js";

describe("software-only card mapping flow", () => {
  it("maps a configured placeholder card into attendance and rejects unknown cards", async () => {
    const app = buildServer({ demo: true, adminToken: "admin-secret", deviceCredential: "device-secret" });
    const adminHeaders = { authorization: "Bearer admin-secret" };
    const deviceHeaders = { authorization: "Bearer device-secret" };
    await app.inject({
      method: "POST",
      url: "/v1/gyms/gym-1/card-mappings",
      headers: adminHeaders,
      payload: { member_id: "member-1", card_id: "ABC123" }
    });

    const queue = new OfflineQueue();
    const results: string[] = [];
    const runtime = new GatewayRuntime({
      gymId: "gym-1",
      cardMap: app.store.cardMappings.exportMap("gym-1"),
      queue,
      now: () => new Date("2026-11-04T12:00:00.000Z"),
      send: async (event) => {
        const response = await app.inject({
          method: "POST",
          url: "/v1/gyms/gym-1/attendance",
          headers: deviceHeaders,
          payload: event
        });
        const body = response.json() as { status: "accepted" | "duplicate" };
        results.push(body.status);
        return body;
      }
    });

    expect(await runtime.onReaderLine("abc123")).toBe(true);
    expect(await runtime.onReaderLine("not-a-card")).toBe(false);
    expect(await runtime.onReaderLine("ABC123")).toBe(true);
    expect(results).toEqual(["accepted", "duplicate"]);
  });
});
