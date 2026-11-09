import type { FastifyInstance } from "fastify";
import { OfflineQueue } from "../../../../packages/gateway/src/queue.js";
import { GatewayRuntime } from "../../../../packages/gateway/src/runtime.js";
import type { ApiStore } from "../server.js";

type Options = {
  send?: (event: { member_id: string; timestamp: string; delivery_id: string }) => Promise<{ status: "accepted" | "duplicate" }>;
  queue?: OfflineQueue;
};

function authorized(request: { headers: { authorization?: string | string[] } }, store: ApiStore): boolean {
  const header = request.headers.authorization;
  return store.adminAuth.authorizeHeader(typeof header === "string" ? header : undefined);
}

export async function registerGatewayTestRoutes(app: FastifyInstance, store: ApiStore, options: Options = {}): Promise<void> {
  const queue = options.queue ?? new OfflineQueue(process.env.STREAK_GATEWAY_QUEUE_PATH);
  const send = options.send ?? (async (event) => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/gyms/gym-1/attendance",
      headers: { authorization: `Bearer ${store.demoCredential}` },
      payload: event
    });
    if (response.statusCode < 200 || response.statusCode >= 300) throw new Error(`attendance rejected with HTTP ${response.statusCode}`);
    return response.json() as { status: "accepted" | "duplicate" };
  });

  app.post<{ Body: { card_id?: string } }>("/demo/gateway-tap", async (request, reply) => {
    if (!authorized(request, store)) return reply.code(401).send({ error: "unauthorized device" });
    if (typeof request.body?.card_id !== "string" || !request.body.card_id.trim()) {
      return reply.code(400).send({ error: "card_id is required" });
    }
    const runtime = new GatewayRuntime({
      gymId: "gym-1",
      cardMap: store.cardMappings.exportMap("gym-1"),
      queue,
      send
    });
    const result = await runtime.handleReaderLine(request.body.card_id);
    return reply.send({
      status: result.status,
      ...(result.status === "unknown-card" ? {} : { member_id: result.memberId }),
      queue_size: result.queueSize
    });
  });

  app.get("/demo/gateway-status", async (request, reply) => {
    if (!authorized(request, store)) return reply.code(401).send({ error: "unauthorized device" });
    return reply.send({ queue_size: queue.size });
  });
}
