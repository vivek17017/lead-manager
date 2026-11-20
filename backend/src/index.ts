
import "dotenv/config";
import express from "express";

const app = express();

const PORT = Number(process.env.PORT || 4000);

// Middleware to parse JSON request bodies
app.use(express.json());

// Health-check API
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Lead Manager API is running"
  });
});

// Start the backend server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
