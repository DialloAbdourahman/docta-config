import express from "express";
import swaggerUi from "swagger-ui-express";
import { errorHandler } from "docta-package";
import periodRouter from "./routers/periodRouter";
import doctorRouter from "./routers/doctorRouter";
import adminRouter from "./routers/adminRouter";
import sessionRouter from "./routers/sessionRouter";

import { swaggerSpec } from "./swagger";

const app = express();

app.use(express.json());

// Swagger documentation route
app.use("/api/config/v1/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API routes
app.use("/api/config/v1/period", periodRouter);
app.use("/api/config/v1/doctor", doctorRouter);
app.use("/api/config/v1/admin", adminRouter);
app.use("/api/config/v1/session", sessionRouter);

app.post("/webhook", (req, res) => {
  console.log("✅ Webhook received:", req.body);
  res.sendStatus(200);
});

app.use(errorHandler);

export default app;
