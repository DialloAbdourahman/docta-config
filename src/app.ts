import express from "express";
import swaggerUi from "swagger-ui-express";
import { errorHandler } from "docta-package";
import periodRouter from "./routers/periodRouter";
import { swaggerSpec } from "./swagger";

const app = express();

app.use(express.json());

// Swagger documentation route
app.use("/api/config/v1/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API routes
app.use("/api/config/v1/period", periodRouter);

app.use(errorHandler);

export default app;
