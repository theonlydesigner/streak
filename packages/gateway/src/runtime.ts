import { randomUUID } from "node:crypto";
import type { AttendanceWebhook } from "@streak/contracts";
import { OfflineQueue } from "./queue.js";
import { SyncWorker } from "./sync-worker.js";

export type GatewayRuntimeOptions = {
  gymId: string;
  cardMap: Record<string, string>;
  queue: OfflineQueue;
  send: (event: AttendanceWebhook) => Promise<{ status: "accepted" | "duplicate" }>;
  now?: () => Date;
};

export type GatewayTapResult =
  | { status: "accepted" | "duplicate"; memberId: string; queueSize: number }
  | { status: "unknown-card"; queueSize: number }
  | { status: "queued-for-retry"; memberId: string; queueSize: number };

export class GatewayRuntime {
  private readonly syncWorker: SyncWorker;
  private readonly now: () => Date;

  constructor(private readonly options: GatewayRuntimeOptions) {
    this.now = options.now ?? (() => new Date());
    this.syncWorker = new SyncWorker(options.queue, options.send);
  }

  async onReaderLine(rawCardId: string): Promise<boolean> {
    const result = await this.handleReaderLine(rawCardId);
    return result.status !== "unknown-card";
  }

  async handleReaderLine(rawCardId: string): Promise<GatewayTapResult> {
    const cardId = rawCardId.trim().toUpperCase();
    const memberId = this.options.cardMap[cardId];
    if (!memberId) return { status: "unknown-card", queueSize: this.options.queue.size };
    const event = {
      member_id: memberId,
      timestamp: this.now().toISOString(),
      delivery_id: randomUUID()
    };
    await this.options.queue.enqueue(event);
    let delivery: { status: "accepted" | "duplicate" } | undefined;
    try {
      const worker = new SyncWorker(this.options.queue, async (queuedEvent) => {
        delivery = await this.options.send(queuedEvent);
        return delivery;
      });
      await worker.syncOnce();
      if (delivery) return { status: delivery.status, memberId, queueSize: this.options.queue.size };
      return { status: "queued-for-retry", memberId, queueSize: this.options.queue.size };
    } catch {
      return { status: "queued-for-retry", memberId, queueSize: this.options.queue.size };
    }
  }

  start(intervalMs = 5000): () => void {
    return this.syncWorker.start(intervalMs);
  }
}
