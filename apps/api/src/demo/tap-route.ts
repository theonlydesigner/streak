import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { ApiStore } from "../server.js";

export async function registerDemoTapRoute(app: FastifyInstance, store: ApiStore): Promise<void> {
  app.post<{ Body: { member_id?: string; timestamp?: string } }>("/demo/tap", async (request, reply) => {
    const memberId = request.body?.member_id;
    if (!memberId || !store.streaks.get(memberId)) {
      return reply.code(400).send({ error: "unknown demo member" });
    }

    const deliveryId = randomUUID();
    const response = await app.inject({
      method: "POST",
      url: "/v1/gyms/gym-1/attendance",
      headers: { authorization: `Bearer ${store.demoCredential}` },
      payload: {
        member_id: memberId,
        timestamp: request.body.timestamp ?? new Date().toISOString(),
        delivery_id: deliveryId
      }
    });
    const result = JSON.parse(response.body) as Record<string, unknown>;
    return reply.code(response.statusCode).send({
      ...result,
      member_id: memberId,
      delivery_id: deliveryId
    });
  });
}
