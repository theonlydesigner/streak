import { describe, expect, it } from "vitest";
import { buildServer } from "./server.js";

describe("authentication boundaries", () => {
  it("uses admin/admin for the local demo when credentials are not configured", async () => {
    const originalAdmin = process.env.STREAK_ADMIN_TOKEN;
    const originalDevice = process.env.STREAK_DEVICE_CREDENTIAL;
    delete process.env.STREAK_ADMIN_TOKEN;
    delete process.env.STREAK_DEVICE_CREDENTIAL;
    try {
      const app = buildServer({ demo: true });
      expect(app.store.adminAuth.authorizeHeader("Basic " + Buffer.from("admin:admin").toString("base64"))).toBe(true);
      expect(app.store.auth.authorize("admin", "gym-1")).toBe(true);
    } finally {
      if (originalAdmin === undefined) delete process.env.STREAK_ADMIN_TOKEN;
      else process.env.STREAK_ADMIN_TOKEN = originalAdmin;
      if (originalDevice === undefined) delete process.env.STREAK_DEVICE_CREDENTIAL;
      else process.env.STREAK_DEVICE_CREDENTIAL = originalDevice;
    }
  });

  it("keeps device auth separate from admin auth", async () => {
    const app = buildServer({
      demo: true,
      adminToken: "admin-secret",
      deviceCredential: "device-secret"
    });

    const attendance = await app.inject({
      method: "POST",
      url: "/v1/gyms/gym-1/attendance",
      headers: { authorization: "Bearer device-secret" },
      payload: {
        member_id: "member-1",
        timestamp: "2026-11-02T04:30:00.000Z",
        delivery_id: "boundary-1"
      }
    });
    expect(attendance.statusCode).toBe(202);

    const adminAsDevice = await app.inject({
      method: "POST",
      url: "/v1/gyms/gym-1/attendance",
      headers: { authorization: "Bearer admin-secret" },
      payload: {
        member_id: "member-1",
        timestamp: "2026-11-02T04:30:00.000Z",
        delivery_id: "boundary-2"
      }
    });
    expect(adminAsDevice.statusCode).toBe(401);
  });

  it("keeps the display public while admin mappings fail closed without a token", async () => {
    const app = buildServer({ demo: true, adminToken: "admin-secret" });
    expect((await app.inject({ method: "GET", url: "/display?gym=gym-1" })).statusCode).toBe(200);
    expect((await app.inject({
      method: "GET",
      url: "/v1/gyms/gym-1/card-mappings"
    })).statusCode).toBe(401);
    expect(app.printRoutes()).toContain("events (GET");
  });

  it("does not reuse the device credential as an admin credential", async () => {
    const app = buildServer({ demo: true, deviceCredential: "device-secret" });
    const response = await app.inject({
      method: "GET",
      url: "/v1/gyms/gym-1/card-mappings",
      headers: { authorization: "Bearer device-secret" }
    });
    expect(response.statusCode).toBe(401);
  });
});
