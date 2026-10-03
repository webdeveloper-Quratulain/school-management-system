import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import prisma from "./lib/prisma.js";
import authRoutes from "./routes/auth.js";
import classRoutes from "./routes/classes.js";
import subjectRoutes from "./routes/subjects.js";
import teacherRoutes from "./routes/teachers.js";
import parentRoutes from "./routes/parents.js";
import studentRoutes from "./routes/students.js";
import attendanceRoutes from "./routes/attendance.js";
import announcementRoutes from "./routes/announcements.js";
import notificationRoutes from "./routes/notifications.js";
import classSubjectRoutes from "./routes/classSubjects.js";
import examRoutes from "./routes/exams.js";
import feeRoutes from "./routes/fees.js";
import timetableRoutes from "./routes/timetable.js";
import dashboardRoutes from "./routes/dashboard.js";

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET is missing or too short. Put a random value of at least 32 characters in .env");
  process.exit(1);
}
if (process.env.NODE_ENV === "production" && !process.env.CORS_ORIGIN) {
  console.error("CORS_ORIGIN must be set in production (the address of your frontend)");
  process.exit(1);
}

const app = express();

// Only needed when the app sits behind a hosting provider's proxy (for example 1 hop on Render)
if (process.env.TRUST_PROXY) {
  app.set("trust proxy", Number(process.env.TRUST_PROXY));
}

app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins }));

app.use(express.json({ limit: "100kb" }));

const limiterOptions = { standardHeaders: "draft-8", legacyHeaders: false };

const apiLimiter = rateLimit({
  ...limiterOptions,
  windowMs: 60 * 1000,
  limit: 600,
  message: { message: "Too many requests. Please slow down and try again shortly." },
});

// Failed logins only: 100 per network, and 8 per account from one network, every 15 minutes
const loginNetworkLimiter = rateLimit({
  ...limiterOptions,
  windowMs: 15 * 60 * 1000,
  limit: 100,
  skipSuccessfulRequests: true,
  message: { message: "Too many failed logins from this network. Please try again later." },
});

const loginAccountLimiter = rateLimit({
  ...limiterOptions,
  windowMs: 15 * 60 * 1000,
  limit: 8,
  skipSuccessfulRequests: true,
  keyGenerator: (req) =>
    `${ipKeyGenerator(req.ip)}|${String(req.body?.email ?? "").toLowerCase().trim().slice(0, 200)}`,
  message: { message: "Too many failed logins. Please wait 15 minutes and try again." },
});

app.get("/", (req, res) => {
  res.send("School Management API is running");
});

app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error" });
  }
});

app.use("/api", apiLimiter);
app.use("/api/auth/login", loginNetworkLimiter, loginAccountLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/parents", parentRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/class-subjects", classSubjectRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/fees", feeRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON in request body" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "Request is too large" });
  }
  console.error(err);
  res.status(500).json({ message: "Something went wrong" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});