import cron from "node-cron";
import { config } from "../config";

async function runEvery15Minutes() {
  // async logic here
  console.log("Running session cleanup cron job");
}

export function startSessionCleanupCron() {
  cron.schedule(
    `*/${config.sessionCleanupCronJobIntervalInMinutes} * * * *`,
    async () => {
      try {
        await runEvery15Minutes();
      } catch (err) {
        console.error("Session cleanup cron failed:", err);
      }
    }
  );
}
