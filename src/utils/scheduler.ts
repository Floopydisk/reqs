import { schedule } from "node-cron";

/**
 * Schedule delivery reminders.
 */
const scheduleDeliveryReminders = () => {
  schedule("*/5 * * * *", () => {
    console.log("Delivery reminders scheduled.");
  });
};

/**
 * Schedule late delivery alerts.
 */
const scheduleLateDeliveryAlerts = () => {
  schedule("*/10 * * * *", () => {
    console.log("Late delivery alerts scheduled.");
  });
};

// --- Scheduler Initialization ---

/**
 * Initializes and starts all scheduled jobs.
 */
export const initializeScheduler = () => {
  scheduleDeliveryReminders();
  scheduleLateDeliveryAlerts();
  console.log("Scheduler initialized and jobs are running.");
};

export {};
