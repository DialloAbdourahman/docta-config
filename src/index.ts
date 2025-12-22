import "reflect-metadata";
import app from "./app";
import { config } from "./config";
import mongoose from "mongoose";
import { LoggedInUserTokenData } from "docta-package";
import { startSessionCleanupCron } from "./cron/session.cleanup";

declare global {
  namespace Express {
    interface Request {
      currentUser?: LoggedInUserTokenData;
    }
  }
}

const start = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoUri);
    console.log("MongoDB connected");
    console.log("Registered models:", mongoose.modelNames());

    // Start cron jobs
    startSessionCleanupCron();

    // Start the server
    app.listen(config.port, () => {
      console.log(`Doctor Config running on port ${config.port}`);
    });

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      console.log("Gracefully shutting down...");
      await mongoose.disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

start();
