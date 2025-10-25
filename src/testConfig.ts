import mongoose from "mongoose";
// import { MongoMemoryServer } from 'mongodb-memory-server';
import request from "supertest";
import app from "./app";

export const api = request(app);

// let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  process.env.ACTIVATION_TOKEN_SECRET =
    process.env.ACTIVATION_TOKEN_SECRET || "testsecret";
  process.env.MONGO_URI = "mongodb://localhost:27017/docta-test";
  // mongoServer = await MongoMemoryServer.create();

  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB test connected");
});

afterAll(async () => {
  await mongoose.disconnect();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
