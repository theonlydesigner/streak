import type { FastifyInstance } from "fastify";
import type { ApiStore } from "../server.js";

type MappingBody = { member_id?: string; card_id?: string };
const responseMapping = (mapping: { gymId: string; memberId: string; cardId: string }) => ({
  gym_id: mapping.gymId,
  member_id: mapping.memberId,
  card_id: mapping.cardId
});

function authorize(request: { headers: Record<string, string | string[] | undefined>; params: { gymId: string } }, store: ApiStore): boolean {
  const header = request.headers.authorization;
  return store.adminAuth.authorizeHeader(typeof header === "string" ? header : undefined);
}

export async function registerCardMappingRoutes(app: FastifyInstance, store: ApiStore): Promise<void> {
  app.get<{ Params: { gymId: string } }>("/v1/gyms/:gymId/card-mappings", async (request, reply) => {
    if (!authorize(request, store)) return reply.code(401).send({ error: "unauthorized device" });
    return reply.send({ mappings: store.cardMappings.list(request.params.gymId).map(responseMapping) });
  });

  app.post<{ Params: { gymId: string }; Body: MappingBody }>("/v1/gyms/:gymId/card-mappings", async (request, reply) => {
    if (!authorize(request, store)) return reply.code(401).send({ error: "unauthorized device" });
    if (!request.body?.member_id || !request.body.card_id) return reply.code(400).send({ error: "member_id and card_id are required" });
    try {
      return reply.code(201).send(responseMapping(store.cardMappings.assign(request.params.gymId, request.body.member_id, request.body.card_id)));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return reply.code(message === "card already assigned" ? 409 : 400).send({ error: message });
    }
  });

  app.put<{ Params: { gymId: string; memberId: string }; Body: Pick<MappingBody, "card_id"> }>("/v1/gyms/:gymId/card-mappings/:memberId", async (request, reply) => {
    if (!authorize(request, store)) return reply.code(401).send({ error: "unauthorized device" });
    if (!request.body?.card_id) return reply.code(400).send({ error: "card_id is required" });
    try {
      return reply.send(responseMapping(store.cardMappings.replace(request.params.gymId, request.params.memberId, request.body.card_id)));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return reply.code(message === "card already assigned" ? 409 : 400).send({ error: message });
    }
  });

  app.delete<{ Params: { gymId: string; memberId: string } }>("/v1/gyms/:gymId/card-mappings/:memberId", async (request, reply) => {
    if (!authorize(request, store)) return reply.code(401).send({ error: "unauthorized device" });
    if (!store.cardMappings.remove(request.params.gymId, request.params.memberId)) {
      return reply.code(404).send({ error: "mapping not found" });
    }
    return reply.send({ status: "removed" });
  });
}
