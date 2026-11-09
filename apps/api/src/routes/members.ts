import type { FastifyInstance } from "fastify";
import type { ApiStore } from "../server.js";
import { normalizeCardId } from "../domain/card-mapping-store.js";

type MemberBody = { member_id?: string; name?: string; card_id?: string };

function authorize(request: { headers: Record<string, string | string[] | undefined> }, store: ApiStore): boolean {
  const header = request.headers.authorization;
  return store.adminAuth.authorizeHeader(typeof header === "string" ? header : undefined);
}

function responseMember(store: ApiStore, gymId: string, memberId: string) {
  const member = store.streaks.get(memberId);
  if (!member || member.gymId !== gymId) return undefined;
  const mapping = store.cardMappings.list(gymId).find((entry) => entry.memberId === memberId);
  return {
    member_id: member.memberId,
    name: member.memberDisplayName,
    card_id: mapping?.cardId,
    active_streak: member.activeStreak,
    personal_best: member.personalBest
  };
}

function errorResponse(reply: { code: (status: number) => { send: (body: { error: string }) => unknown } }, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const status = message === "member already exists" || message === "card already assigned" ? 409
    : message === "member not found" ? 404 : 400;
  return reply.code(status).send({ error: message });
}

export async function registerMemberRoutes(app: FastifyInstance, store: ApiStore): Promise<void> {
  app.get<{ Params: { gymId: string } }>("/v1/gyms/:gymId/members", async (request, reply) => {
    if (!authorize(request, store)) return reply.code(401).send({ error: "unauthorized admin" });
    return reply.send({
      members: store.streaks.all()
        .filter((member) => member.gymId === request.params.gymId)
        .map((member) => responseMember(store, request.params.gymId, member.memberId))
    });
  });

  app.post<{ Params: { gymId: string }; Body: MemberBody }>("/v1/gyms/:gymId/members", async (request, reply) => {
    if (!authorize(request, store)) return reply.code(401).send({ error: "unauthorized admin" });
    const memberId = request.body?.member_id?.trim();
    const name = request.body?.name?.trim();
    const cardId = request.body?.card_id ? normalizeCardId(request.body.card_id) : "";
    if (!memberId || !name || !cardId) return reply.code(400).send({ error: "member_id, name, and card_id are required" });
    if (store.streaks.get(memberId)) return reply.code(409).send({ error: "member already exists" });
    if (!store.cardMappings.isAvailable(request.params.gymId, cardId)) {
      return reply.code(409).send({ error: "card already assigned" });
    }

    try {
      store.streaks.registerMember({
        gymId: request.params.gymId,
        memberId,
        memberDisplayName: name,
        activeStreak: 0,
        personalBest: 0
      });
      try {
        store.cardMappings.assign(request.params.gymId, memberId, cardId);
      } catch (error) {
        store.streaks.removeMember(memberId);
        throw error;
      }
      return reply.code(201).send(responseMember(store, request.params.gymId, memberId));
    } catch (error) {
      return errorResponse(reply, error);
    }
  });

  app.put<{ Params: { gymId: string; memberId: string }; Body: Pick<MemberBody, "name" | "card_id"> }>("/v1/gyms/:gymId/members/:memberId", async (request, reply) => {
    if (!authorize(request, store)) return reply.code(401).send({ error: "unauthorized admin" });
    const name = request.body?.name?.trim();
    const cardId = request.body?.card_id ? normalizeCardId(request.body.card_id) : "";
    if (!name || !cardId) return reply.code(400).send({ error: "name and card_id are required" });
    const member = store.streaks.get(request.params.memberId);
    if (!member || member.gymId !== request.params.gymId) return reply.code(404).send({ error: "member not found" });
    if (!store.cardMappings.isAvailable(request.params.gymId, cardId, request.params.memberId)) {
      return reply.code(409).send({ error: "card already assigned" });
    }
    const original = { ...member };
    try {
      store.streaks.updateMember(request.params.memberId, { memberDisplayName: name });
      store.cardMappings.replace(request.params.gymId, request.params.memberId, cardId);
      return reply.send(responseMember(store, request.params.gymId, request.params.memberId));
    } catch (error) {
      store.streaks.set(original);
      return errorResponse(reply, error);
    }
  });

  app.delete<{ Params: { gymId: string; memberId: string } }>("/v1/gyms/:gymId/members/:memberId", async (request, reply) => {
    if (!authorize(request, store)) return reply.code(401).send({ error: "unauthorized admin" });
    const member = store.streaks.get(request.params.memberId);
    if (!member || member.gymId !== request.params.gymId) return reply.code(404).send({ error: "member not found" });
    const mapping = store.cardMappings.list(request.params.gymId)
      .find((entry) => entry.memberId === request.params.memberId);
    try {
      store.cardMappings.remove(request.params.gymId, request.params.memberId);
      store.streaks.removeMember(request.params.memberId);
      return reply.send({ status: "removed" });
    } catch (error) {
      if (mapping && store.streaks.get(request.params.memberId)) {
        store.cardMappings.replace(request.params.gymId, request.params.memberId, mapping.cardId);
      }
      return errorResponse(reply, error);
    }
  });
}
