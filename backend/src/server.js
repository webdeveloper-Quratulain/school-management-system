
import "dotenv/config";
import express from "express";
import cors from "cors";
import prisma from "./lib/prisma.js";
import authRoutes from "./routes/auth.js";
import classRoutes from "./routes/classes.js";
import subjectRoutes from "./routes/subjects.js";
import teacherRoutes from "./routes/teachers.js";
import parentRoutes from "./routes/parents.js";
import studentRoutes from "./routes/students.js";
import attendanceRoutes from "./routes/attendance.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/parents", parentRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);


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