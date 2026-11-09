import { describe, expect, it } from "vitest";
import { buildServer } from "../server.js";

describe("member routes", () => {
  it("creates and lists a member with zero streak values", async () => {
    const app = buildServer({ demo: true, adminToken: "admin-secret", deviceCredential: "device-secret" });
    const headers = { authorization: "Bearer admin-secret" };

    const response = await app.inject({
      method: "POST",
      url: "/v1/gyms/gym-1/members",
      headers,
      payload: { member_id: "member-4", name: "Priya", card_id: " xyz789 " }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      member_id: "member-4",
      name: "Priya",
      card_id: "XYZ789",
      active_streak: 0,
      personal_best: 0
    });
    const listed = (await app.inject({
      method: "GET",
      url: "/v1/gyms/gym-1/members",
      headers
    })).json() as { members: Array<Record<string, unknown>> };
    expect(listed.members.find((member) => member.member_id === "member-4")).toMatchObject({
      member_id: "member-4", name: "Priya", card_id: "XYZ789"
    });
  });

  it("updates a member name and card and removes the member", async () => {
    const app = buildServer({ demo: true, adminToken: "admin-secret", deviceCredential: "device-secret" });
    const headers = { authorization: "Bearer admin-secret" };
    await app.inject({
      method: "POST",
      url: "/v1/gyms/gym-1/members",
      headers,
      payload: { member_id: "member-4", name: "Priya", card_id: "XYZ789" }
    });

    const update = await app.inject({
      method: "PUT",
      url: "/v1/gyms/gym-1/members/member-4",
      headers,
      payload: { name: "Priya Sharma", card_id: "new789" }
    });
    expect(update.statusCode).toBe(200);
    expect(update.json()).toMatchObject({ name: "Priya Sharma", card_id: "NEW789", active_streak: 0 });

    const removal = await app.inject({
      method: "DELETE",
      url: "/v1/gyms/gym-1/members/member-4",
      headers
    });
    expect(removal.statusCode).toBe(200);
    expect(app.store.streaks.get("member-4")).toBeUndefined();
    expect(app.store.cardMappings.list("gym-1")).toEqual([]);
  });

  it("rejects duplicate IDs and cards without creating partial members", async () => {
    const app = buildServer({ demo: true, adminToken: "admin-secret", deviceCredential: "device-secret" });
    const headers = { authorization: "Bearer admin-secret" };
    const create = (member_id: string, card_id: string) => app.inject({
      method: "POST",
      url: "/v1/gyms/gym-1/members",
      headers,
      payload: { member_id, name: "Member", card_id }
    });

    expect((await create("member-4", "XYZ789")).statusCode).toBe(201);
    expect((await create("member-4", "NEW789")).statusCode).toBe(409);
    expect((await create("member-5", "xyz789")).statusCode).toBe(409);
    expect(app.store.streaks.get("member-5")).toBeUndefined();
  });

  it("rolls back a member when card assignment fails", async () => {
    const app = buildServer({ demo: true, adminToken: "admin-secret", deviceCredential: "device-secret" });
    const headers = { authorization: "Bearer admin-secret" };
    const assign = app.store.cardMappings.assign;
    app.store.cardMappings.assign = () => {
      throw new Error("card persistence failed");
    };

    const response = await app.inject({
      method: "POST",
      url: "/v1/gyms/gym-1/members",
      headers,
      payload: { member_id: "member-4", name: "Priya", card_id: "XYZ789" }
    });

    app.store.cardMappings.assign = assign;
    expect(response.statusCode).toBe(400);
    expect(app.store.streaks.get("member-4")).toBeUndefined();
  });

  it("restores the original name when card replacement fails", async () => {
    const app = buildServer({ demo: true, adminToken: "admin-secret", deviceCredential: "device-secret" });
    const headers = { authorization: "Bearer admin-secret" };
    await app.inject({
      method: "POST",
      url: "/v1/gyms/gym-1/members",
      headers,
      payload: { member_id: "member-4", name: "Priya", card_id: "XYZ789" }
    });
    const replace = app.store.cardMappings.replace;
    app.store.cardMappings.replace = () => {
      throw new Error("card persistence failed");
    };

    const response = await app.inject({
      method: "PUT",
      url: "/v1/gyms/gym-1/members/member-4",
      headers,
      payload: { name: "Changed", card_id: "NEW789" }
    });

    app.store.cardMappings.replace = replace;
    expect(response.statusCode).toBe(400);
    expect(app.store.streaks.get("member-4")?.memberDisplayName).toBe("Priya");
  });

  it("restores the card mapping when member removal fails", async () => {
    const app = buildServer({ demo: true, adminToken: "admin-secret", deviceCredential: "device-secret" });
    const headers = { authorization: "Bearer admin-secret" };
    await app.inject({
      method: "POST",
      url: "/v1/gyms/gym-1/members",
      headers,
      payload: { member_id: "member-4", name: "Priya", card_id: "XYZ789" }
    });
    const removeMember = app.store.streaks.removeMember;
    app.store.streaks.removeMember = () => {
      throw new Error("member persistence failed");
    };

    const response = await app.inject({
      method: "DELETE",
      url: "/v1/gyms/gym-1/members/member-4",
      headers
    });

    app.store.streaks.removeMember = removeMember;
    expect(response.statusCode).toBe(400);
    expect(app.store.cardMappings.list("gym-1")).toMatchObject([{ memberId: "member-4", cardId: "XYZ789" }]);
  });

  it("validates fields and protects all member operations", async () => {
    const app = buildServer({ demo: true, adminToken: "admin-secret", deviceCredential: "device-secret" });
    expect((await app.inject({
      method: "GET",
      url: "/v1/gyms/gym-1/members"
    })).statusCode).toBe(401);
    expect((await app.inject({
      method: "POST",
      url: "/v1/gyms/gym-1/members",
      headers: { authorization: "Bearer admin-secret" },
      payload: { member_id: "member-4", name: "Priya" }
    })).statusCode).toBe(400);
  });
});
