import { describe, expect, it } from "vitest";
import { buildServer } from "./server.js";

describe("health endpoint", () => {
  it("reports the API as ready without secrets", async () => {
    const response = await buildServer({ deviceCredential: "test-only-secret" }).inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
    expect(response.body).not.toContain("device-secret");
  });
});
