import { describe, expect, it } from "vitest";
import { buildServer } from "../server.js";

describe("demo mapping page", () => {
  it("renders mapping controls and placeholder hardware guidance", async () => {
    const app = buildServer({ demo: true, adminToken: "admin-secret", deviceCredential: "device-secret" });
    const response = await app.inject({
      method: "GET",
      url: "/admin/mappings?gym=gym-1",
      headers: { authorization: "Bearer admin-secret" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("CARD MAPPING");
    expect(response.body).toContain("ABC123");
    expect(response.body).toContain("placeholder");
    expect(response.body).toContain("card-mappings");
    expect(response.body).not.toContain("admin-secret");
    expect(response.body).not.toContain("innerHTML=(data.mappings");
    expect(response.body).toContain("textContent");
    expect(response.body.indexOf("Card ID")).toBeLessThan(response.body.indexOf("Member ID"));
    expect(response.body).toContain("MEMBER MANAGEMENT");
    expect(response.body).toContain("Add member");
    expect(response.body).toContain("/members");
    expect(response.body).toContain("Edit");
    expect(response.body).toContain("Remove member");
    expect(response.body).toContain("Admin username");
    expect(response.body).toContain("Admin password");
    expect(response.body).toContain('"authorization":"Basic "');
    expect(response.body).not.toContain("Enter STREAK admin token");
  });

  it("rejects missing and incorrect admin tokens", async () => {
    const app = buildServer({ demo: true, adminToken: "admin-secret" });
    const missing = await app.inject({ method: "GET", url: "/admin/mappings?gym=gym-1" });
    expect(missing.statusCode).toBe(401);
    expect(missing.headers["www-authenticate"]).toBe('Basic realm="STREAK Admin"');
    expect((await app.inject({
      method: "GET",
      url: "/admin/mappings?gym=gym-1",
      headers: { authorization: "Bearer wrong" }
    })).statusCode).toBe(401);
  });
});
