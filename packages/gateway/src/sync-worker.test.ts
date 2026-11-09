import { describe, expect, it } from "vitest";
import { OfflineQueue } from "./queue.js";
import { SyncWorker } from "./sync-worker.js";

describe("gateway sync worker", () => {
  it("acknowledges a queued tap after the cloud accepts it", async () => {
    const queue = new OfflineQueue();
    await queue.enqueue({
      member_id: "member-1",
      timestamp: "2026-11-02T04:30:00.000Z",
      delivery_id: "delivery-1"
    });
    const sent: string[] = [];
    const worker = new SyncWorker(queue, async (event) => {
      sent.push(event.delivery_id);
      return { status: "accepted" };
    });

    await worker.syncOnce();

    expect(sent).toEqual(["delivery-1"]);
    expect(queue.size).toBe(0);
  });

  it("retains a queued tap when the cloud is unavailable", async () => {
    const queue = new OfflineQueue();
    await queue.enqueue({
      member_id: "member-1",
      timestamp: "2026-11-02T04:30:00.000Z",
      delivery_id: "delivery-1"
    });
    const worker = new SyncWorker(queue, async () => {
      throw new Error("offline");
    });

    await worker.syncOnce();

    expect(queue.size).toBe(1);
  });

  it("runs automatic retries until stopped", async () => {
    const queue = new OfflineQueue();
    await queue.enqueue({
      member_id: "member-1",
      timestamp: "2026-11-02T04:30:00.000Z",
      delivery_id: "delivery-1"
    });
    let attempts = 0;
    const worker = new SyncWorker(queue, async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("offline");
      return { status: "accepted" };
    });

    const stop = worker.start(1);
    await new Promise((resolve) => setTimeout(resolve, 10));
    stop();

    expect(attempts).toBeGreaterThanOrEqual(2);
    expect(queue.size).toBe(0);
  });
});
