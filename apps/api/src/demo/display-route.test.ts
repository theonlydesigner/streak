import { describe, expect, it } from "vitest";
import { buildServer } from "../server.js";

describe("demo display route", () => {
  it("serves a demo display shell from the same process", async () => {
    const app = buildServer({ demo: true });
    const response = await app.inject({
      method: "GET",
      url: "/display?gym=gym-1"
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain("DEMO MODE");
    expect(response.body).toContain("/v1/gyms/");
    expect(response.body).toContain("STREAK // DAILY PROGRESS");
    expect(response.body).toContain("Waiting for first check-in");
    expect(response.body).toContain("@media (max-width: 700px)");
  });

  it("serves the approved display palette", async () => {
    const app = buildServer({ demo: true });
    const response = await app.inject({
      method: "GET",
      url: "/display?gym=gym-1"
    });
    expect(response.body).toContain("--color-bg:#000000");
    expect(response.body).toContain("--color-panel:#141414");
    expect(response.body).toContain("--color-accent-1:#F58821");
    expect(response.body).toContain("--color-accent-2:#E4501A");
    expect(response.body).toContain("--color-rank-1:#FFB866");
    expect(response.body).toContain("--color-secondary-text:#C8C8C8");
    expect(response.body).toContain("--color-on-orange:#0A0A0A");
  });

  it("serves a browser-compatible display script", async () => {
    const app = buildServer({ demo: true });
    const response = await app.inject({
      method: "GET",
      url: "/display/client.js"
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("javascript");
    expect(response.body).toContain("EventSource");
    expect(response.body).toContain("/leaderboard");
    expect(response.body).toContain("ACTIVE STREAK");
    expect(response.body).toContain("PERSONAL BEST");
    expect(response.body).toContain("WELCOME BACK");
    expect(response.body).toContain("welcome-active");
    expect(response.body).toContain("escapeHtml");
    expect(response.body).toContain("escapeHtml(String(welcome.activeStreak))");
    expect(response.body).toContain("escapeHtml(String(entry.activeStreak))");
    expect(response.body).toContain("Math.max(0, Date.parse(welcome.expiresAt) - Date.now())");
    expect(response.body).toContain("if (!response.ok) throw new Error");
    expect(response.body).toContain("try { welcome = JSON.parse(event.data);");
  });

  it("serves the seeded leaderboard before any tap occurs", async () => {
    const app = buildServer({ demo: true });
    const response = await app.inject({
      method: "GET",
      url: "/v1/gyms/gym-1/leaderboard"
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ memberDisplayName: "Rahul" })
    ]));
  });
});
