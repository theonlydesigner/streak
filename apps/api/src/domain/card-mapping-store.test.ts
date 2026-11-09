import { describe, expect, it } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { InMemoryStreakStore } from "./streak-engine.js";
import { CardMappingStore } from "./card-mapping-store.js";

describe("card mapping store", () => {
  it("normalizes card ids and exports a gateway map", () => {
    const members = new InMemoryStreakStore();
    members.registerMember({ gymId: "gym-1", memberId: "member-1", memberDisplayName: "Rahul", activeStreak: 0, personalBest: 1 });
    const store = new CardMappingStore(members);

    store.assign("gym-1", "member-1", " abc123 ");

    expect(store.list("gym-1")).toEqual([{ gymId: "gym-1", memberId: "member-1", cardId: "ABC123" }]);
    expect(store.exportMap("gym-1")).toEqual({ ABC123: "member-1" });
  });

  it("rejects duplicate cards and replaces a member's old card", () => {
    const members = new InMemoryStreakStore();
    members.registerMember({ gymId: "gym-1", memberId: "member-1", memberDisplayName: "Rahul", activeStreak: 0, personalBest: 1 });
    members.registerMember({ gymId: "gym-1", memberId: "member-2", memberDisplayName: "Ananya", activeStreak: 0, personalBest: 1 });
    const store = new CardMappingStore(members);
    store.assign("gym-1", "member-1", "ABC123");

    expect(() => store.assign("gym-1", "member-2", "ABC123")).toThrow("card already assigned");
    store.replace("gym-1", "member-1", "DEF456");
    expect(store.exportMap("gym-1")).toEqual({ DEF456: "member-1" });
  });

  it("persists mappings across restarts", async () => {
    const directory = await mkdtemp(join(tmpdir(), "streak-mappings-"));
    const file = join(directory, "mappings.json");
    const members = new InMemoryStreakStore();
    members.registerMember({ gymId: "gym-1", memberId: "member-1", memberDisplayName: "Rahul", activeStreak: 0, personalBest: 1 });
    new CardMappingStore(members, file).assign("gym-1", "member-1", "ABC123");

    const restarted = new CardMappingStore(members, file);
    expect(restarted.exportMap("gym-1")).toEqual({ ABC123: "member-1" });
  });

  it("does not mutate memory when persistence fails", async () => {
    const members = new InMemoryStreakStore();
    members.registerMember({ gymId: "gym-1", memberId: "member-1", memberDisplayName: "Rahul", activeStreak: 0, personalBest: 1 });
    const store = new CardMappingStore(members, join("missing-directory", "mappings.json"));

    expect(() => store.assign("gym-1", "member-1", "ABC123")).toThrow();
    expect(store.list("gym-1")).toEqual([]);
  });
});
