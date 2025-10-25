import express from "express";
import swaggerUi from "swagger-ui-express";
import { errorHandler } from "docta-package";
import periodRouter from "./routers/periodRouter";
import doctorRouter from "./routers/doctorRouter";
import adminRouter from "./routers/adminRouter";

import { swaggerSpec } from "./swagger";

const app = express();

app.use(express.json());

// Swagger documentation route
app.use("/api/config/v1/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API routes
app.use("/api/config/v1/period", periodRouter);
app.use("/api/config/v1/doctor", doctorRouter);
app.use("/api/config/v1/admin", adminRouter);

app.use(errorHandler);

export default app;
