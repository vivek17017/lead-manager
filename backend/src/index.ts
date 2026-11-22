
import "dotenv/config";

import express from "express";
import cookieParser from "cookie-parser";

import { pool } from "./db";
import { authRouter } from "./auth";
import { leadsRouter } from "./leads";

import {
  apiErrorHandler,
  sendApiError
} from "./api-errors";

const app = express();

const PORT = Number(process.env.PORT || 4000);

// Parse JSON with a 10 KB body limit
app.use(express.json({ limit: "10kb" }));

// Read cookies sent by the browser
app.use(cookieParser());

// Require a security header for state-changing requests
app.use("/api", (req, res, next) => {
  const writeMethods = [
    "POST",
    "PUT",
    "PATCH",
    "DELETE"
  ];

  if (
    writeMethods.includes(req.method) &&
    req.get("X-Requested-With") !== "XMLHttpRequest"
  ) {
    sendApiError(
      res,
      403,
      "FORBIDDEN",
      "Missing request security header"
    );
    return;
  }

  next();
});

// Health check
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");

    res.status(200).json({
      status: "ok",
      database: "connected",
      message: "Lead Manager API is running"
    });
  } catch (error) {
    console.error(
      "Database health check failed:",
      error
    );

    sendApiError(
      res,
      503,
      "DATABASE_UNAVAILABLE",
      "Database temporarily unavailable. Please try again later."
    );
  }
});

// Register routes
app.use("/api/auth", authRouter);
app.use("/api/leads", leadsRouter);

// Unknown API endpoints
app.use("/api", (_req, res) => {
  sendApiError(
    res,
    404,
    "NOT_FOUND",
    "API endpoint not found"
  );
});

// Centralized error handler: keep this last
app.use(apiErrorHandler);

// Start Express
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
