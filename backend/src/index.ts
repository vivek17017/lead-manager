
import "dotenv/config";
import express from "express";
import { pool } from "./db";

const app = express();

const PORT = Number(process.env.PORT || 4000);

// Parse JSON request bodies
app.use(express.json());

// API and database health check
app.get("/api/health", async (_req, res) => {
  try {
    // Check whether PostgreSQL is reachable
    await pool.query("SELECT 1");

    res.status(200).json({
      status: "ok",
      database: "connected",
      message: "Lead Manager API is running"
    });

  } catch (error) {
    // Log the actual error on the server
    console.error(
      "Database health check failed:",
      error
    );

    // Return a safe message to the frontend
    res.status(503).json({
      status: "error",
      message: "Database temporarily unavailable"
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
