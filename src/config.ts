import dotenv from "dotenv";

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  mongoUri: string;
  accessTokenSecret: string;
  rabbitmqHost: string;
  platformPercentage: number;
  collectionPercentage: number;
  disbursementPercentage: number;
  sessionPaymentTimeExpireInMinutes: number;
  sessionCleanupCronJobIntervalInMinutes: number;
  doctorCanCancelBeforeTimeInMins: number;
  patientCanCancelBeforeTimeInMins: number;
}

export const config: Config = {
  port: Number(process.env.PORT),
  nodeEnv: String(process.env.NODE_ENV),
  mongoUri: String(process.env.MONGO_URI),
  accessTokenSecret: String(process.env.ACCESS_TOKEN_SECRET),
  rabbitmqHost: String(process.env.RABBITMQ_HOST),
  platformPercentage: Number(process.env.PLATFORM_PERCENTAGE),
  collectionPercentage: Number(process.env.COLLECTION_PERCENTAGE),
  disbursementPercentage: Number(process.env.DISTRIBUTION_PERCENTAGE),
  sessionPaymentTimeExpireInMinutes: Number(
    process.env.SESSION_PAYMENT_TIME_EXPIRE_IN_MINS
  ),
  sessionCleanupCronJobIntervalInMinutes: Number(
    process.env.SESSION_CLEANUP_CRON_JOB_INTERVAL_IN_MINS
  ),
  doctorCanCancelBeforeTimeInMins: Number(
    process.env.DOCTOR_CAN_CANCEL_BEFORE_TIME_IN_MINS
  ),
  patientCanCancelBeforeTimeInMins: Number(
    process.env.PATIENT_CAN_CANCEL_BEFORE_TIME_IN_MINS
  ),
};
