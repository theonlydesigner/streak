import { existsSync, readFileSync } from "node:fs";
import { stdin } from "node:process";
import { OfflineQueue } from "./queue.js";
import { ReaderLineParser } from "./reader.js";
import { GatewayRuntime } from "./runtime.js";

const apiUrl = process.env.STREAK_API_URL ?? "http://127.0.0.1:3001";
const gymId = process.env.STREAK_GYM_ID ?? "gym-1";
const credential = process.env.STREAK_DEVICE_CREDENTIAL ?? "";
const queuePath = process.env.STREAK_QUEUE_PATH ?? "./streak-queue.json";
const cardMapPath = process.env.STREAK_CARD_MAP_PATH ?? "./card-map.json";

if (!credential) throw new Error("STREAK_DEVICE_CREDENTIAL is required");
if (!existsSync(cardMapPath)) throw new Error(`card map not found: ${cardMapPath}`);

const cardMap = JSON.parse(readFileSync(cardMapPath, "utf8")) as Record<string, string>;
const queue = new OfflineQueue(queuePath);
const runtime = new GatewayRuntime({
  gymId,
  cardMap,
  queue,
  send: async (event) => {
    const response = await fetch(`${apiUrl}/v1/gyms/${gymId}/attendance`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${credential}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(event)
    });
    if (!response.ok) throw new Error(`attendance rejected with HTTP ${response.status}`);
    return (await response.json()) as { status: "accepted" | "duplicate" };
  }
});

const parser = new ReaderLineParser();
const stopSync = runtime.start();
stdin.setEncoding("utf8");
stdin.on("data", (chunk: string) => {
  for (const line of parser.push(chunk)) {
    void runtime.onReaderLine(line).then((knownCard) => {
      if (!knownCard) process.stderr.write(`unknown card: ${line.trim()}\n`);
    }).catch((error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    });
  }
});

const shutdown = (): void => {
  stopSync();
  stdin.pause();
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
