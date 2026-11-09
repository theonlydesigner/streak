import type { AttendanceWebhook } from "@streak/contracts";
import { OfflineQueue } from "./queue.js";

type SendResult = { status: "accepted" | "duplicate" };

export class SyncWorker {
  constructor(
    private readonly queue: OfflineQueue,
    private readonly send: (event: AttendanceWebhook) => Promise<SendResult>
  ) {}

  async syncOnce(): Promise<void> {
    for (const event of this.queue.pending()) {
      if (!(await this.queue.markSending(event.delivery_id))) continue;
      try {
        await this.send(event);
        await this.queue.acknowledge(event.delivery_id);
      } catch {
        await this.queue.markRetryable(event.delivery_id);
      }
    }
  }

  start(intervalMs = 5000): () => void {
    let stopped = false;
    const run = async (): Promise<void> => {
      if (stopped) return;
      await this.syncOnce();
      if (!stopped) setTimeout(run, intervalMs);
    };
    void run();
    return () => {
      stopped = true;
    }
  }
}
