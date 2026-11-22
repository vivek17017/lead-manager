
import express from "express";
import cookieParser from "cookie-parser";
import path from "node:path";
import { pool } from "./db";
import { authRouter } from "./auth";
import { leadsRouter } from "./leads";

import {
  apiErrorHandler,
  sendApiError
} from "./api-errors";

export const app = express();
// Render uses a reverse proxy in production
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}
// Parse JSON request bodies
app.use(express.json({ limit: "10kb" }));

// Read authentication cookies
app.use(cookieParser());

// Require the security header for write requests
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
    console.error("Database health check failed:", error);

    sendApiError(
      res,
      503,
      "DATABASE_UNAVAILABLE",
      "Database temporarily unavailable. Please try again later."
    );
  }
});

// REST API routes
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

/**
 * Serve the compiled React application in production.
 *
 * Compiled backend location:
 *   backend/dist/app.js
 *
 * Compiled frontend location:
 *   frontend/dist/
 */
if (process.env.NODE_ENV === "production") {
  const frontendDist = path.resolve(
    __dirname,
    "../../frontend/dist"
  );

  // Serve compiled JavaScript, CSS, and other assets
  app.use(express.static(frontendDist));

  // React Router fallback for frontend routes
  app.get("/{*splat}", (req, res, next) => {
    // Don't return HTML for missing asset files
    if (path.extname(req.path)) {
      next();
      return;
    }

    res.sendFile(
      path.join(frontendDist, "index.html"),
      (error) => {
        if (error) next(error);
      }
    );
  });
}

// Centralized error handler must remain last
app.use(apiErrorHandler);
