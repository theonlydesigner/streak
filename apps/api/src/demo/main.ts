import type { FastifyInstance } from "fastify";
import { buildServer } from "../server.js";

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
  await app.listen({ host: "127.0.0.1", port });
  return app as DemoServer;
}

if (process.argv[1]?.endsWith("main.ts")) {
  void startDemoServer().then(() => {
    console.log("STREAK demo running at http://localhost:3001");
    console.log("Open http://localhost:3001/display?gym=gym-1");
  });
}
