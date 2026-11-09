import type { InMemoryStreakStore, JsonStreakStore } from "../domain/streak-engine.js";

export type DemoMember = {
  memberId: string;
  memberDisplayName: string;
  activeStreak: number;
  personalBest: number;
};

export const demoMembers: DemoMember[] = [
  { memberId: "member-1", memberDisplayName: "Rahul", activeStreak: 12, personalBest: 18 },
  { memberId: "member-2", memberDisplayName: "Ananya", activeStreak: 9, personalBest: 14 },
  { memberId: "member-3", memberDisplayName: "Vikram", activeStreak: 6, personalBest: 11 }
];

export function seedDemoMembers(store: InMemoryStreakStore | JsonStreakStore): void {
  for (const member of demoMembers) {
    if (store.get(member.memberId)) continue;
    store.registerMember({
      gymId: store.config.gymId,
      memberId: member.memberId,
      memberDisplayName: member.memberDisplayName,
      activeStreak: member.activeStreak,
      personalBest: member.personalBest
    });
  }
}
