import type { FastifyInstance } from "fastify";
import { buildServer } from "../server.js";
import { demoMembers } from "./seed.js";

export type DemoServer = FastifyInstance & {
  store: ReturnType<typeof buildServer>["store"];
};

export async function startDemoServer(port = 3001): Promise<DemoServer> {
  const app = buildServer({
    demo: true,
    deviceCredential: process.env.STREAK_DEVICE_CREDENTIAL,
    adminToken: process.env.STREAK_ADMIN_TOKEN,
    statePath: process.env.STREAK_STATE_PATH,
    deliveryStorePath: process.env.STREAK_DELIVERY_STORE_PATH
  });

  // Permanent demo cards: card "1" -> member "1", ... card "10" -> member "10".
  // Skips anything already mapped, so cards you edit in the admin page are never overwritten.
  const gymId = app.store.streaks.config.gymId;
  for (const member of demoMembers) {
    const hasCard = app.store.cardMappings.list(gymId).some((m) => m.memberId === member.memberId);
    if (hasCard || !app.store.cardMappings.isAvailable(gymId, member.memberId)) continue;
    app.store.cardMappings.assign(gymId, member.memberId, member.memberId);
  }

  await app.listen({ host: "127.0.0.1", port });
  return app as DemoServer;
}

if (process.argv[1]?.endsWith("main.ts")) {
  void startDemoServer().then(() => {
    console.log("STREAK demo running at http://localhost:3001");
    console.log("Open http://localhost:3001/display?gym=gym-1");
  });
}