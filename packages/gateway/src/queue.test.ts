import { describe, expect, it } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { OfflineQueue } from "./queue.js";

describe("offline attendance queue", () => {
  it("persists a tap before attempting delivery and acknowledges it exactly once", async () => {
    const queue = new OfflineQueue();
    await queue.enqueue({
      member_id: "member-1",
      timestamp: "2026-11-02T04:30:00.000Z",
      delivery_id: "delivery-1"
    });

    expect(queue.pending()).toHaveLength(1);
    expect(await queue.acknowledge("delivery-1")).toBe(true);
    expect(queue.pending()).toHaveLength(0);
    expect(await queue.acknowledge("delivery-1")).toBe(false);
  });

  it("retains a failed delivery for retry", async () => {
    const queue = new OfflineQueue();
    await queue.enqueue({
      member_id: "member-1",
      timestamp: "2026-11-02T04:30:00.000Z",
      delivery_id: "delivery-1"
    });
    await queue.markRetryable("delivery-1");
    expect(queue.pending()[0]?.delivery_id).toBe("delivery-1");
  });

  it("restores queued taps after a process restart", async () => {
    const directory = await mkdtemp(join(tmpdir(), "streak-queue-"));
    const file = join(directory, "queue.json");
    const first = new OfflineQueue(file);
    await first.enqueue({
      member_id: "member-1",
      timestamp: "2026-11-02T04:30:00.000Z",
      delivery_id: "delivery-1"
    });

    const restarted = new OfflineQueue(file);
    expect(restarted.pending()).toHaveLength(1);
    expect((await readFile(file, "utf8")).length).toBeGreaterThan(0);
  });

  it("recovers an in-flight tap after a gateway crash", async () => {
    const directory = await mkdtemp(join(tmpdir(), "streak-queue-"));
    const file = join(directory, "queue.json");
    const first = new OfflineQueue(file);
    await first.enqueue({
      member_id: "member-1",
      timestamp: "2026-11-02T04:30:00.000Z",
      delivery_id: "delivery-1"
    });
    await first.markSending("delivery-1");

    const restarted = new OfflineQueue(file);
    expect(restarted.pending()).toHaveLength(1);
  });
});
