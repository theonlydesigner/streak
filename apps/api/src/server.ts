import Fastify from "fastify";
import { DeviceAuth } from "./services/device-auth.js";
import { AdminAuth } from "./services/admin-auth.js";
import { InMemoryStreakStore, JsonStreakStore } from "./domain/streak-engine.js";
import type { StreakStore } from "./domain/streak-engine.js";
import { registerAttendanceWebhook } from "./routes/attendance-webhook.js";
import { InMemoryEventBus } from "./realtime/event-bus.js";
import { registerSseRoute } from "./realtime/sse-route.js";
import { registerHealthRoute } from "./health.js";
import { DeliveryStore } from "./services/delivery-store.js";
import { seedDemoMembers } from "./demo/seed.js";
import { registerDemoTapRoute } from "./demo/tap-route.js";
import { registerDemoDisplayRoute } from "./demo/display-route.js";
import { CardMappingStore } from "./domain/card-mapping-store.js";
import { registerCardMappingRoutes } from "./routes/card-mappings.js";
import { registerMemberRoutes } from "./routes/members.js";
import { registerDemoMappingRoute } from "./demo/mapping-route.js";
import { registerGatewayTestRoutes } from "./demo/gateway-test-route.js";
import { registerGatewayTestPage } from "./demo/gateway-test-page.js";

export type ApiStore = {
  auth: DeviceAuth;
  adminAuth: AdminAuth;
  streaks: StreakStore;
  events: InMemoryEventBus;
  deliveries: Set<string>;
  deliveryResults: DeliveryStore;
  cardMappings: CardMappingStore;
  demoCredential: string;
  attendanceCount: () => number;
};

export function buildServer(options: { demo?: boolean; deviceCredential?: string; adminToken?: string; deliveryStorePath?: string; statePath?: string; gatewaySend?: (event: { member_id: string; timestamp: string; delivery_id: string }) => Promise<{ status: "accepted" | "duplicate" }> } = {}) {
  const app = Fastify({ logger: false });
  const streaks = options.statePath
    ? new JsonStreakStore({ gymId: "gym-1", timezone: "Asia/Kolkata" }, options.statePath)
    : new InMemoryStreakStore({ gymId: "gym-1", timezone: "Asia/Kolkata" });
  const events = new InMemoryEventBus();
  const demoCredential = options.deviceCredential ?? process.env.STREAK_DEVICE_CREDENTIAL ?? (options.demo ? "admin" : "");
  const adminToken = options.adminToken ?? process.env.STREAK_ADMIN_TOKEN ?? (options.demo ? "admin" : "");
  const store: ApiStore = {
    auth: new DeviceAuth(demoCredential),
    adminAuth: new AdminAuth(adminToken),
    streaks,
    events,
    deliveries: new Set(),
    deliveryResults: new DeliveryStore(options.deliveryStorePath),
    cardMappings: new CardMappingStore(
      streaks,
      options.statePath && !(streaks instanceof JsonStreakStore) ? options.statePath : undefined,
      streaks instanceof JsonStreakStore ? streaks : undefined
    ),
    demoCredential,
    attendanceCount: () => streaks.all().length
  };
  void registerAttendanceWebhook(app, store);
  void registerCardMappingRoutes(app, store);
  void registerMemberRoutes(app, store);
  void registerSseRoute(app, events);
  void registerHealthRoute(app);
  if (options.demo) {
    seedDemoMembers(streaks);
    void registerDemoTapRoute(app, store);
    void registerDemoDisplayRoute(app, store);
    void registerDemoMappingRoute(app, store);
    void registerGatewayTestRoutes(app, store, { send: options.gatewaySend });
    void registerGatewayTestPage(app, store);
  }
  (app as typeof app & { store: ApiStore }).store = store;
  return app as typeof app & { store: ApiStore };
}
