import type { AttendanceWebhook } from "@streak/contracts";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";

type QueueItem = AttendanceWebhook & {
  status: "pending" | "sending" | "failed";
  attempts: number;
};

export class OfflineQueue {
  private readonly items = new Map<string, QueueItem>();
  private readonly filePath?: string;

  constructor(filePath?: string) {
    this.filePath = filePath;
    if (filePath && existsSync(filePath)) {
      const saved = JSON.parse(readFileSync(filePath, "utf8")) as QueueItem[];
      for (const item of saved) {
        this.items.set(item.delivery_id, {
          ...item,
          status: item.status === "sending" ? "pending" : item.status
        });
      }
    }
  }

  async enqueue(event: AttendanceWebhook): Promise<void> {
    if (!this.items.has(event.delivery_id)) {
      this.items.set(event.delivery_id, { ...event, status: "pending", attempts: 0 });
      this.persist();
    }
  }

  pending(): AttendanceWebhook[] {
    return [...this.items.values()]
      .filter((item) => item.status === "pending" || item.status === "failed")
      .map(({ status: _status, attempts: _attempts, ...event }) => event);
  }

  async markSending(deliveryId: string): Promise<boolean> {
    const item = this.items.get(deliveryId);
    if (!item || item.status === "sending") return false;
    item.status = "sending";
    item.attempts += 1;
    this.persist();
    return true;
  }

  async markRetryable(deliveryId: string): Promise<boolean> {
    const item = this.items.get(deliveryId);
    if (!item) return false;
    item.status = "failed";
    this.persist();
    return true;
  }

  async acknowledge(deliveryId: string): Promise<boolean> {
    const deleted = this.items.delete(deliveryId);
    if (deleted) this.persist();
    return deleted;
  }

  get size(): number {
    return this.pending().length;
  }

  private persist(): void {
    if (!this.filePath) return;
    const temporaryPath = `${this.filePath}.tmp`;
    writeFileSync(temporaryPath, JSON.stringify([...this.items.values()]), "utf8");
    renameSync(temporaryPath, this.filePath);
  }
}
