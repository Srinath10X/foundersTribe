import express from "express";
import cors from "cors";
import helmet from "helmet";

import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { apiRateLimiter } from "./middleware/rateLimiter.js";
import { authMiddleware } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";

import healthRoutes from "./routes/health.js";
import gigsRoutes from "./routes/gigs.js";
import gigProposalsRoutes from "./routes/gigProposals.js";
import proposalsRoutes from "./routes/proposals.js";
import contractsRoutes from "./routes/contracts.js";
import contractMessagesRoutes from "./routes/contractMessages.js";
import contractRatingsRoutes from "./routes/contractRatings.js";
import notificationsRoutes from "./routes/notifications.js";
import usersRoutes from "./routes/users.js";
import servicesRoutes from "./routes/services.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN === "*" ? "*" : env.CORS_ORIGIN.split(","),
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(apiRateLimiter);

app.use("/api/health", healthRoutes);

app.use(authMiddleware);

app.use("/api/gigs", gigsRoutes);
app.use("/api/gigs/:id/proposals", gigProposalsRoutes);
app.use("/api/proposals", proposalsRoutes);
app.use("/api/contracts", contractsRoutes);
app.use("/api/contracts/:id/messages", contractMessagesRoutes);
app.use("/api/contracts/:id/rate", contractRatingsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/services", servicesRoutes);

app.use(errorHandler);

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "gig-marketplace-service running");
});
