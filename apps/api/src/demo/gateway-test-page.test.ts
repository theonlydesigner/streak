import { describe, expect, it } from "vitest";
import { buildServer } from "../server.js";

describe("gateway test page", () => {
  it("renders the software-only gateway console", async () => {
    const app = buildServer({ demo: true, adminToken: "admin-secret", deviceCredential: "device-secret" });
    const response = await app.inject({
      method: "GET",
      url: "/admin/gateway-test?gym=gym-1",
      headers: { authorization: "Bearer admin-secret" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("GATEWAY TEST CONSOLE");
    expect(response.body).toContain("card_id");
    expect(response.body).toContain("/demo/gateway-tap");
    expect(response.body).toContain("software fixture");
    expect(response.body).not.toContain("admin-secret");
    expect(response.body).toContain("Admin username");
    expect(response.body).toContain("Admin password");
    expect(response.body).toContain('"authorization":"Basic "');
    expect(response.body).not.toContain("Enter STREAK admin token");
  });

  it("rejects missing admin credentials", async () => {
    const app = buildServer({ demo: true, adminToken: "admin-secret" });
    const response = await app.inject({ method: "GET", url: "/admin/gateway-test?gym=gym-1" });
    expect(response.statusCode).toBe(401);
    expect(response.headers["www-authenticate"]).toBe('Basic realm="STREAK Admin"');
  });
});
