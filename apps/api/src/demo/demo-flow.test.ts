import { describe, expect, it } from "vitest";
import { startDemoServer } from "./main.js";

describe("local demo flow", () => {
  it("serves health/display and broadcasts a simulated tap", async () => {
    const server = await startDemoServer(0);
    const address = server.server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const baseUrl = `http://127.0.0.1:${port}`;
    const iterator = server.store.events.subscribeGymEvents("gym-1")[Symbol.asyncIterator]();
    const welcome = iterator.next();
    const leaderboard = iterator.next();

    expect((await fetch(`${baseUrl}/health`)).status).toBe(200);
    expect((await fetch(`${baseUrl}/display?gym=gym-1`)).status).toBe(200);
    const response = await fetch(`${baseUrl}/demo/tap`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ member_id: "member-1" })
    });

    expect(response.status).toBe(202);
    expect((await welcome).value).toMatchObject({ type: "welcome", memberId: "member-1" });
    expect((await leaderboard).value).toMatchObject({ type: "leaderboard", gymId: "gym-1" });
    await server.close();
  });
});
