import { afterEach, describe, expect, it } from "vitest";
import { startDemoServer } from "./main.js";

describe("demo server configuration", () => {
  const originalDeviceCredential = process.env.STREAK_DEVICE_CREDENTIAL;

  afterEach(() => {
    if (originalDeviceCredential === undefined) delete process.env.STREAK_DEVICE_CREDENTIAL;
    else process.env.STREAK_DEVICE_CREDENTIAL = originalDeviceCredential;
  });

  it("uses the configured device credential for demo attendance", async () => {
    process.env.STREAK_DEVICE_CREDENTIAL = "configured-device";
    const app = await startDemoServer(0);
    try {
      expect(app.store.auth.authorize("configured-device", "gym-1")).toBe(true);
    } finally {
      await app.close();
    }
  });
});
