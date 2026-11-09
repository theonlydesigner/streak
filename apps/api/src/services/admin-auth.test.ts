import { describe, expect, it } from "vitest";
import { AdminAuth } from "./admin-auth.js";

describe("admin auth", () => {
  it("accepts only the configured non-empty token", () => {
    expect(new AdminAuth("secret").authorize("secret")).toBe(true);
    expect(new AdminAuth("secret").authorize("wrong")).toBe(false);
    expect(new AdminAuth("").authorize("anything")).toBe(false);
    expect(new AdminAuth("secret").authorize("")).toBe(false);
  });

  it("accepts bearer and browser basic-auth headers", () => {
    const auth = new AdminAuth("secret");
    expect(auth.authorizeHeader("Bearer secret")).toBe(true);
    expect(auth.authorizeHeader("Basic " + Buffer.from("admin:secret").toString("base64"))).toBe(true);
    expect(auth.authorizeHeader("Basic " + Buffer.from("admin:wrong").toString("base64"))).toBe(false);
  });
});
