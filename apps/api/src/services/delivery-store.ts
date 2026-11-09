import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";

export type DeliveryResult = { activeStreak: number; personalBest: number };

export class DeliveryStore {
  private readonly values = new Map<string, DeliveryResult>();

  constructor(private readonly filePath?: string) {
    if (filePath && existsSync(filePath)) {
      const saved = JSON.parse(readFileSync(filePath, "utf8")) as Record<string, DeliveryResult>;
      for (const [key, value] of Object.entries(saved)) this.values.set(key, value);
    }
  }

  get(gymId: string, deliveryId: string): DeliveryResult | undefined {
    return this.values.get(`${gymId}:${deliveryId}`);
  }

  set(gymId: string, deliveryId: string, result: DeliveryResult): void {
    this.values.set(`${gymId}:${deliveryId}`, result);
    if (!this.filePath) return;
    const temporaryPath = `${this.filePath}.tmp`;
    writeFileSync(temporaryPath, JSON.stringify(Object.fromEntries(this.values)), "utf8");
    renameSync(temporaryPath, this.filePath);
  }
}
