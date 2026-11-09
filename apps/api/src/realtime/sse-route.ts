import type { FastifyInstance } from "fastify";
import type { InMemoryEventBus } from "./event-bus.js";
import type { GymEvent } from "./event-bus.js";

export function formatSseEvent(event: GymEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export async function registerSseRoute(app: FastifyInstance, bus: InMemoryEventBus): Promise<void> {
  app.get<{ Params: { gymId: string } }>("/v1/gyms/:gymId/events", async (request, reply) => {
    const iterator = bus.subscribeGymEvents(request.params.gymId)[Symbol.asyncIterator]();
    reply.hijack();
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive"
    });
    const heartbeat = setInterval(() => reply.raw.write(": heartbeat\n\n"), 15000);
    request.raw.on("close", () => {
      clearInterval(heartbeat);
      void iterator.return?.();
    });
    try {
      while (!reply.raw.destroyed) {
        const result = await iterator.next();
        if (result.done) break;
        reply.raw.write(formatSseEvent(result.value));
      }
    } finally {
      clearInterval(heartbeat);
      await iterator.return?.();
      if (!reply.raw.writableEnded) reply.raw.end();
    }
  });
}
