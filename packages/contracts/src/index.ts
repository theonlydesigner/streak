import { z } from "zod";

export const AttendanceWebhookSchema = z.object({
  member_id: z.string().min(1),
  timestamp: z.string().datetime({ offset: true }),
  delivery_id: z.string().min(1)
}).strict();

export const WelcomeEventSchema = z.object({
  type: z.literal("welcome"),
  gymId: z.string().min(1),
  memberId: z.string().min(1),
  memberDisplayName: z.string().min(1),
  activeStreak: z.number().int().positive(),
  personalBest: z.number().int().positive(),
  occurredAt: z.string().datetime({ offset: true }),
  expiresAt: z.string().datetime({ offset: true }),
  sourceTimestamp: z.string().datetime({ offset: true }).optional()
}).refine((event) => Date.parse(event.expiresAt) - Date.parse(event.occurredAt) === 5000, {
  message: "welcome events must expire exactly five seconds after occurrence"
});

export const LeaderboardEntrySchema = z.object({
  memberId: z.string().min(1),
  memberDisplayName: z.string().min(1),
  activeStreak: z.number().int().nonnegative(),
  personalBest: z.number().int().positive()
});

export const LeaderboardSnapshotSchema = z.object({
  type: z.literal("leaderboard").default("leaderboard"),
  gymId: z.string().min(1),
  entries: z.array(LeaderboardEntrySchema).max(10),
  generatedAt: z.string().datetime({ offset: true })
});

export type AttendanceWebhook = z.infer<typeof AttendanceWebhookSchema>;
export type WelcomeEvent = z.infer<typeof WelcomeEventSchema>;
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;
export type LeaderboardSnapshot = z.infer<typeof LeaderboardSnapshotSchema>;
