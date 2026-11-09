import { describe, expect, it } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { OfflineQueue } from "./queue.js";
import { GatewayRuntime } from "./runtime.js";

describe("gateway runtime", () => {
  it("maps a reader card tap, queues it before sending, and syncs it", async () => {
    const directory = await mkdtemp(join(tmpdir(), "streak-gateway-"));
    const queue = new OfflineQueue(join(directory, "queue.json"));
    const sent: string[] = [];
    const runtime = new GatewayRuntime({
      gymId: "gym-1",
      cardMap: { "ABC123": "member-1" },
      queue,
      send: async (event) => {
        sent.push(event.member_id);
        return { status: "accepted" };
      },
      now: () => new Date("2026-11-04T12:00:00.000Z")
    });

    await runtime.onReaderLine("abc123");

    expect(sent).toEqual(["member-1"]);
    expect(queue.pending()).toHaveLength(0);
  });

  it("keeps unknown cards out of the attendance queue", async () => {
    const queue = new OfflineQueue();
    const runtime = new GatewayRuntime({
      gymId: "gym-1",
      cardMap: {},
      queue,
      send: async () => ({ status: "accepted" })
    });

    await expect(runtime.onReaderLine("unknown")).resolves.toBe(false);
    expect(queue.pending()).toHaveLength(0);
  });
});
