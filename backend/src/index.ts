
import "dotenv/config";
import express, { type ErrorRequestHandler } from "express";
import cookieParser from "cookie-parser";

import { pool } from "./db";
import { authRouter } from "./auth";

const app = express();
const PORT = Number(process.env.PORT || 4000);

// Parse incoming JSON, with a request size limit
app.use(express.json({ limit: "10kb" }));

// Parse incoming cookies
app.use(cookieParser());

// Require a custom header for state-changing API requests
app.use("/api", (req, res, next) => {
  const writeMethods = ["POST", "PUT", "PATCH", "DELETE"];

  if (
    writeMethods.includes(req.method) &&
    req.get("X-Requested-With") !== "XMLHttpRequest"
  ) {
    res.status(403).json({
      message: "Missing request security header"
    });
    return;
  }

  next();
});

// Database health check
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

    res.status(503).json({
      status: "error",
      message: "Database temporarily unavailable"
    });
  }
});

// Authentication endpoints
app.use("/api/auth", authRouter);

// Unknown API endpoints
app.use("/api", (_req, res) => {
  res.status(404).json({
    message: "API endpoint not found"
  });
});

// Centralized Express error handler
const errorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next
) => {
  if (error?.type === "entity.parse.failed") {
    res.status(400).json({
      message: "Invalid JSON request body"
    });
    return;
  }

  console.error("Unexpected server error:", error);

  res.status(500).json({
    message: "Internal server error"
  });
};

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
