
import "dotenv/config";
import express from "express";
import cors from "cors";
import prisma from "./lib/prisma.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("School Management API is running");
});
app.get("/api/health", async (req, res) => {
  try {
    const users = await prisma.user.count();
    res.json({ status: "ok", database: "connected", users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", message: "Database connection failed" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});