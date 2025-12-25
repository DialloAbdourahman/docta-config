import express from "express";
import swaggerUi from "swagger-ui-express";
import { errorHandler, logger } from "docta-package";
import periodRouter from "./routers/periodRouter";
import doctorRouter from "./routers/doctorRouter";
import adminRouter from "./routers/adminRouter";
import sessionRouter from "./routers/sessionRouter";
import ratingRouter from "./routers/ratingRouter";

import { swaggerSpec } from "./swagger";

const app = express();

app.use(express.json());

// Request logger
app.use((req, res, next) => {
  logger.info(`Request: ${req.method} ${req.url}`, {
    method: req.method,
    route: req.path,
    baseUrl: req.baseUrl,
    originalUrl: req.originalUrl,
    params: req.params,
    query: req.query,
    body: req.body,
    headers: req.headers,
    ip: req.ip,
  });
  next();
});

// Swagger documentation route
app.use("/api/config/v1/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API routes
app.use("/api/config/v1/period", periodRouter);
app.use("/api/config/v1/doctor", doctorRouter);
app.use("/api/config/v1/admin", adminRouter);
app.use("/api/config/v1/session", sessionRouter);
app.use("/api/config/v1/rating", ratingRouter);

app.post("/webhook", (req, res) => {
  console.log("✅ Webhook received:", req.body);
  res.sendStatus(200);
});

app.use(errorHandler);

export default app;
