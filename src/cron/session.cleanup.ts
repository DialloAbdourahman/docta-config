import cron from "node-cron";
import { config } from "../config";
import {
  SessionModel,
  ISessionDocument,
  EnumSessionStatus,
  PeriodModel,
  IPeriodDocument,
  PeriodStatus,
  logger,
} from "docta-package";
import mongoose, { AnyBulkWriteOperation } from "mongoose";

async function runEvery15Minutes() {
  // async logic here
  logger.info("Running session cleanup cron job");

  // Get all sessions whose expireAt has passed
  const expiredSessions: ISessionDocument[] = await SessionModel.find({
    expiresAt: { $lt: Date.now() },
    status: EnumSessionStatus.CREATED,
  }).populate("period");

  logger.info(`Found ${expiredSessions.length} expired sessions`);

  if (expiredSessions.length === 0) {
    return;
  }

  // Prepare bulk operations
  const sessionBulkOps: AnyBulkWriteOperation<ISessionDocument>[] = [];
  const periodBulkOps: AnyBulkWriteOperation<IPeriodDocument>[] = [];

  // Process each expired session
  for (const session of expiredSessions) {
    // Get the period
    const period = session.period as IPeriodDocument;

    if (!period) {
      logger.error(`Period not found for session`, session);
      continue;
    }

    // Add update operations to bulk arrays
    sessionBulkOps.push({
      updateOne: {
        filter: { _id: session._id },
        update: {
          $set: {
            status: EnumSessionStatus.CANCELLED_DUE_TO_TIME_OUT,
            cancelledAt: Date.now(),
          },
        },
      },
    });

    periodBulkOps.push({
      updateOne: {
        filter: { _id: period._id },
        update: {
          $set: {
            status: PeriodStatus.Available,
          },
        },
      },
    });
  }

  // Execute bulk operations in a transaction
  const sessionTransaction = await mongoose.startSession();

  try {
    await sessionTransaction.withTransaction(async () => {
      if (sessionBulkOps.length > 0) {
        await SessionModel.bulkWrite(sessionBulkOps, {
          session: sessionTransaction,
        });
      }

      if (periodBulkOps.length > 0) {
        await PeriodModel.bulkWrite(periodBulkOps, {
          session: sessionTransaction,
        });
      }
    });

    logger.info(`Successfully cleaned up ${sessionBulkOps.length} sessions`);
  } catch (error) {
    logger.error("Failed to cleanup sessions:", error);
  } finally {
    sessionTransaction.endSession();
  }
}

export function startSessionCleanupCron() {
  cron.schedule(
    `*/${config.sessionCleanupCronJobIntervalInMinutes} * * * *`,
    async () => {
      try {
        await runEvery15Minutes();
      } catch (err) {
        logger.error("Session cleanup cron failed:", err);
      }
    }
  );
}
