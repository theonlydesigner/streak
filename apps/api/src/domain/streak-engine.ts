import type { AttendanceWebhook } from "@streak/contracts";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";

export type MemberState = {
  gymId: string;
  memberId: string;
  memberDisplayName: string;
  activeStreak: number;
  personalBest: number;
  lastVisitDate?: string;
};

export type ProcessAttendanceResult = {
  status: "accepted" | "duplicate";
  activeStreak: number;
  personalBest: number;
  visitDate: string;
};

type StoreConfig = { gymId: string; timezone: string };
export type StreakStore = {
  readonly config: StoreConfig;
  get(memberId: string): MemberState | undefined;
  set(member: MemberState): void;
  registerMember(member: Omit<MemberState, "lastVisitDate">): void;
  updateMember(memberId: string, patch: { memberDisplayName: string }): MemberState;
  removeMember(memberId: string): boolean;
  all(): MemberState[];
  hasVisit(memberId: string, visitDate: string): boolean;
  addVisit(memberId: string, visitDate: string): void;
};

export type JsonStateExtensionHost = {
  readExtension(name: string): unknown;
  writeExtension(name: string, value: unknown): void;
};

export class InMemoryStreakStore implements StreakStore {
  readonly config: StoreConfig;
  private readonly members = new Map<string, MemberState>();
  private readonly visits = new Set<string>();

  constructor(config: StoreConfig = { gymId: "gym-1", timezone: "UTC" }) {
    this.config = config;
  }

  get(memberId: string): MemberState | undefined {
    return this.members.get(memberId);
  }

  set(member: MemberState): void {
    this.members.set(member.memberId, member);
  }

  registerMember(member: Omit<MemberState, "lastVisitDate">): void {
    if (this.members.has(member.memberId)) throw new Error("member already exists");
    this.members.set(member.memberId, { ...member });
  }

  updateMember(memberId: string, patch: { memberDisplayName: string }): MemberState {
    const member = this.members.get(memberId);
    if (!member) throw new Error("member not found");
    const updated = { ...member, memberDisplayName: patch.memberDisplayName };
    this.members.set(memberId, updated);
    return updated;
  }

  removeMember(memberId: string): boolean {
    const deleted = this.members.delete(memberId);
    if (!deleted) return false;
    for (const visit of this.visits) {
      if (visit.startsWith(`${memberId}:`)) this.visits.delete(visit);
    }
    return true;
  }

  all(): MemberState[] {
    return [...this.members.values()];
  }

  hasVisit(memberId: string, visitDate: string): boolean {
    return this.visits.has(`${memberId}:${visitDate}`);
  }

  addVisit(memberId: string, visitDate: string): void {
    this.visits.add(`${memberId}:${visitDate}`);
  }
}

type PersistedState = { members: MemberState[]; visits: string[] };

export class JsonStreakStore implements StreakStore {
  private readonly members = new Map<string, MemberState>();
  private readonly visits = new Set<string>();
  private readonly extensions: Record<string, unknown> = {};

  constructor(readonly config: StoreConfig, private readonly filePath: string) {
    if (!existsSync(filePath)) return;
    const saved = JSON.parse(readFileSync(filePath, "utf8")) as PersistedState & Record<string, unknown>;
    for (const member of saved.members) this.members.set(member.memberId, member);
    for (const visit of saved.visits) this.visits.add(visit);
    for (const [key, value] of Object.entries(saved)) {
      if (key !== "members" && key !== "visits") this.extensions[key] = value;
    }
  }

  get(memberId: string): MemberState | undefined {
    return this.members.get(memberId);
  }

  set(member: MemberState): void {
    this.members.set(member.memberId, member);
    this.persist();
  }

  registerMember(member: Omit<MemberState, "lastVisitDate">): void {
    if (this.members.has(member.memberId)) throw new Error("member already exists");
    this.members.set(member.memberId, { ...member });
    this.persist();
  }

  updateMember(memberId: string, patch: { memberDisplayName: string }): MemberState {
    const member = this.members.get(memberId);
    if (!member) throw new Error("member not found");
    const updated = { ...member, memberDisplayName: patch.memberDisplayName };
    this.members.set(memberId, updated);
    this.persist();
    return updated;
  }

  removeMember(memberId: string): boolean {
    const deleted = this.members.delete(memberId);
    if (!deleted) return false;
    for (const visit of this.visits) {
      if (visit.startsWith(`${memberId}:`)) this.visits.delete(visit);
    }
    this.persist();
    return true;
  }

  all(): MemberState[] {
    return [...this.members.values()];
  }

  hasVisit(memberId: string, visitDate: string): boolean {
    return this.visits.has(`${memberId}:${visitDate}`);
  }

  addVisit(memberId: string, visitDate: string): void {
    this.visits.add(`${memberId}:${visitDate}`);
    this.persist();
  }

  readExtension(name: string): unknown {
    return this.extensions[name];
  }

  writeExtension(name: string, value: unknown): void {
    this.extensions[name] = value;
    this.persist();
  }

  private persist(): void {
    const temporaryPath = `${this.filePath}.tmp`;
    writeFileSync(temporaryPath, JSON.stringify({
      members: this.all(),
      visits: [...this.visits],
      ...this.extensions
    }), "utf8");
    renameSync(temporaryPath, this.filePath);
  }
}

function localDate(timestamp: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function previousDate(date: string): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
}

export async function processAttendance(
  store: StreakStore,
  input: AttendanceWebhook,
  memberDisplayName = input.member_id
): Promise<ProcessAttendanceResult> {
  const visitDate = localDate(input.timestamp, store.config.timezone);
  const existing = store.get(input.member_id);
  if (store.hasVisit(input.member_id, visitDate)) {
    return {
      status: "duplicate",
      activeStreak: existing?.activeStreak ?? 1,
      personalBest: existing?.personalBest ?? 1,
      visitDate
    };
  }

  const activeStreak = existing?.lastVisitDate === previousDate(visitDate)
    ? existing.activeStreak + 1
    : 1;
  const personalBest = Math.max(existing?.personalBest ?? 0, activeStreak);
  store.addVisit(input.member_id, visitDate);
  store.set({
    gymId: store.config.gymId,
    memberId: input.member_id,
    memberDisplayName: existing?.memberDisplayName ?? memberDisplayName,
    activeStreak,
    personalBest,
    lastVisitDate: visitDate
  });
  return { status: "accepted", activeStreak, personalBest, visitDate };
}
