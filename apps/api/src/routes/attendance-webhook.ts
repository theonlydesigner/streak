import { AttendanceWebhookSchema } from "@streak/contracts";
import type { FastifyInstance } from "fastify";
import { processAttendance } from "../domain/streak-engine.js";
import { getLeaderboard } from "../domain/leaderboard.js";
import type { ApiStore } from "../server.js";

export async function registerAttendanceWebhook(app: FastifyInstance, store: ApiStore): Promise<void> {
  app.post<{ Params: { gymId: string } }>("/v1/gyms/:gymId/attendance", async (request, reply) => {
    const authorization = request.headers.authorization;
    const credential = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!store.auth.authorize(credential, request.params.gymId)) {
      return reply.code(401).send({ error: "unauthorized device" });
    }

    const parsed = AttendanceWebhookSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid attendance payload" });
    }

    const existing = store.deliveryResults.get(request.params.gymId, parsed.data.delivery_id);
    if (existing) {
      return reply.code(200).send({
        status: "duplicate",
        active_streak: existing.activeStreak,
        personal_best: existing.personalBest
      });
    }
    const result = await processAttendance(store.streaks, parsed.data);
    store.deliveries.add(parsed.data.delivery_id);
    store.deliveryResults.set(request.params.gymId, parsed.data.delivery_id, {
      activeStreak: result.activeStreak,
      personalBest: result.personalBest
    });
    if (result.status === "accepted") {
      const occurredAt = new Date();
      await store.events.publishGymEvent(request.params.gymId, {
        type: "welcome",
        gymId: request.params.gymId,
        memberId: parsed.data.member_id,
        memberDisplayName: store.streaks.get(parsed.data.member_id)?.memberDisplayName ?? parsed.data.member_id,
        activeStreak: result.activeStreak,
        personalBest: result.personalBest,
        occurredAt: occurredAt.toISOString(),
        expiresAt: new Date(occurredAt.getTime() + 5000).toISOString(),
        sourceTimestamp: parsed.data.timestamp
      });
      await store.events.publishGymEvent(
        request.params.gymId,
        await getLeaderboard(store.streaks, request.params.gymId)
      );
    }
    return reply.code(result.status === "accepted" ? 202 : 200).send({
      status: result.status,
      active_streak: result.activeStreak,
      personal_best: result.personalBest
    });
  });
}
