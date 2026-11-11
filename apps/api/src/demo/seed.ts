import type { InMemoryStreakStore, JsonStreakStore } from "../domain/streak-engine.js";

export type DemoMember = {
  memberId: string;
  memberDisplayName: string;
  activeStreak: number;
  personalBest: number;
};

// member-4 is intentionally skipped: tests create "member-4" (Priya) through the admin API.
export const demoMembers: DemoMember[] = [
  { memberId: "1", memberDisplayName: "SANDEEP KHAIRWAL", activeStreak: 38, personalBest: 45 },
  { memberId: "2", memberDisplayName: "Dev Singh", activeStreak: 29, personalBest: 33 },
  { memberId: "3", memberDisplayName: "Ankit Yadav", activeStreak: 24, personalBest: 30 },
  { memberId: "4", memberDisplayName: "Rohan Malhotra", activeStreak: 21, personalBest: 21 },
  { memberId: "5", memberDisplayName: "Neha Kapoor", activeStreak: 18, personalBest: 26 },
  { memberId: "6", memberDisplayName: "Arjun Bhardwaj", activeStreak: 15, personalBest: 19 },
  { memberId: "7", memberDisplayName: "Simran Kaur Gill", activeStreak: 12, personalBest: 17 },
  { memberId: "8", memberDisplayName: "Karan Dahiya", activeStreak: 9, personalBest: 14 },
  { memberId: "9", memberDisplayName: "Aditi Deshmukh", activeStreak: 7, personalBest: 11 },
  { memberId: "10", memberDisplayName: "Manish Rawat", activeStreak: 5, personalBest: 8 }
];

function yesterday(timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date());
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const d = new Date(`${v.year}-${v.month}-${v.day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function seedDemoMembers(store: InMemoryStreakStore | JsonStreakStore): void {
  const lastVisitDate = yesterday(store.config.timezone);
  for (const member of demoMembers) {
    if (store.get(member.memberId)) continue;
    store.set({
      gymId: store.config.gymId,
      memberId: member.memberId,
      memberDisplayName: member.memberDisplayName,
      activeStreak: member.activeStreak,
      personalBest: member.personalBest,
      lastVisitDate
    });
  }
}