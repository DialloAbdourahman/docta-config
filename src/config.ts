import dotenv from "dotenv";

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  mongoUri: string;
  accessTokenSecret: string;
  refreshTokenSecret: string;
  rabbitmqHost: string;
  platformPercentage: number;
  collectionPercentage: number;
  disbursementPercentage: number;
}

export const config: Config = {
  port: Number(process.env.PORT),
  nodeEnv: String(process.env.NODE_ENV),
  mongoUri: String(process.env.MONGO_URI),
  accessTokenSecret: String(process.env.ACCESS_TOKEN_SECRET),
  refreshTokenSecret: String(process.env.REFRESH_TOKEN_SECRET),
  rabbitmqHost: String(process.env.RABBITMQ_HOST),
  platformPercentage: Number(process.env.PLATFORM_PERCENTAGE),
  collectionPercentage: Number(process.env.COLLECTION_PERCENTAGE),
  disbursementPercentage: Number(process.env.DISTRIBUTION_PERCENTAGE),
};
