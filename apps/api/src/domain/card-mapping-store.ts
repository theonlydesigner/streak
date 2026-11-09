import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import type { JsonStateExtensionHost, StreakStore } from "./streak-engine.js";

export type CardMapping = {
  gymId: string;
  memberId: string;
  cardId: string;
};

type PersistedMappings = { version: 1; mappings: CardMapping[] };

export function normalizeCardId(cardId: string): string {
  return cardId.trim().toUpperCase();
}

export class CardMappingStore {
  private readonly mappings = new Map<string, CardMapping>();

  constructor(
    private readonly members: StreakStore,
    private readonly filePath?: string,
    private readonly extensionHost?: JsonStateExtensionHost
  ) {
    const saved = extensionHost?.readExtension("cardMappings") ??
      (filePath && existsSync(filePath) ? JSON.parse(readFileSync(filePath, "utf8")) : undefined);
    const mappings = Array.isArray(saved) ? saved : (saved as PersistedMappings | undefined)?.mappings;
    for (const mapping of mappings ?? []) {
      this.mappings.set(this.key(mapping.gymId, mapping.memberId), {
        ...mapping,
        cardId: normalizeCardId(mapping.cardId)
      });
    }
  }

  list(gymId: string): CardMapping[] {
    return [...this.mappings.values()].filter((mapping) => mapping.gymId === gymId);
  }

  isAvailable(gymId: string, cardId: string, memberId?: string): boolean {
    const existing = this.findByCard(gymId, normalizeCardId(cardId));
    return !existing || existing.memberId === memberId;
  }

  assign(gymId: string, memberId: string, cardId: string): CardMapping {
    this.assertMember(gymId, memberId);
    const normalized = normalizeCardId(cardId);
    if (!normalized) throw new Error("card id is required");
    const existing = this.findByCard(gymId, normalized);
    if (existing) throw new Error("card already assigned");
    const mapping = { gymId, memberId, cardId: normalized };
    this.persist([...this.mappings.values(), mapping]);
    this.mappings.set(this.key(gymId, memberId), mapping);
    return mapping;
  }

  replace(gymId: string, memberId: string, cardId: string): CardMapping {
    this.assertMember(gymId, memberId);
    const normalized = normalizeCardId(cardId);
    if (!normalized) throw new Error("card id is required");
    const existing = this.findByCard(gymId, normalized);
    if (existing && existing.memberId !== memberId) throw new Error("card already assigned");
    const mapping = { gymId, memberId, cardId: normalized };
    const candidate = [...this.mappings.values()]
      .filter((entry) => entry.memberId !== memberId || entry.gymId !== gymId)
      .concat(mapping);
    this.persist(candidate);
    this.mappings.set(this.key(gymId, memberId), mapping);
    return mapping;
  }

  remove(gymId: string, memberId: string): boolean {
    const key = this.key(gymId, memberId);
    const deleted = this.mappings.has(key);
    if (deleted) {
      this.persist([...this.mappings.values()].filter((mapping) => this.key(mapping.gymId, mapping.memberId) !== key));
      this.mappings.delete(key);
    }
    return deleted;
  }

  exportMap(gymId: string): Record<string, string> {
    return Object.fromEntries(this.list(gymId).map((mapping) => [mapping.cardId, mapping.memberId]));
  }

  private assertMember(gymId: string, memberId: string): void {
    const member = this.members.get(memberId);
    if (!member || member.gymId !== gymId) throw new Error("member not found");
  }

  private findByCard(gymId: string, cardId: string): CardMapping | undefined {
    return this.list(gymId).find((mapping) => mapping.cardId === cardId);
  }

  private key(gymId: string, memberId: string): string {
    return `${gymId}:${memberId}`;
  }

  private persist(mappings: CardMapping[]): void {
    if (this.extensionHost) {
      this.extensionHost.writeExtension("cardMappings", mappings);
      return;
    }
    if (!this.filePath) return;
    const temporaryPath = `${this.filePath}.tmp`;
    writeFileSync(temporaryPath, JSON.stringify({ version: 1, mappings } satisfies PersistedMappings), "utf8");
    renameSync(temporaryPath, this.filePath);
  }
}
