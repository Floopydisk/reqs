import { notifications } from "./notification";

let initialized = false;

export function initQueue(): void {
  if (initialized) return;
  initialized = true;
  const enabled =
    (process.env.ENABLE_QUEUES || "false").toLowerCase() === "true";
  if (!enabled) return;

  let Queue: any, Worker: any;
  try {
    ({ Queue, Worker } = require("bullmq"));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[queue] ENABLE_QUEUES=true but bullmq not installed");
    return;
  }

  const connection = {
    connection: { url: process.env.REDIS_URL || "redis://localhost:6379" },
  };
  const notifyQueue = new Queue("notifications", connection);

  notifications.on("notification", async (payload: any) => {
    try {
      await notifyQueue.add("notify", payload, {
        removeOnComplete: 100,
        removeOnFail: 100,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[queue] enqueue failed", e);
    }
  });

  new Worker(
    "notifications",
    async (job: any) => {
      // For now, just log – real workers can send push/mobile, etc.
      // eslint-disable-next-line no-console
      console.log("[queue] processing", job.name, job.id);
    },
    connection
  );
}
