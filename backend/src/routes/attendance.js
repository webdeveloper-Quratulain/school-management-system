import { Router } from "express";
import prisma from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

const STATUSES = ["PRESENT", "ABSENT", "LATE", "LEAVE"];

function parseDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(value);
  if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return null;
  return d;
}

async function canManageClass(user, classId) {
  if (user.role === "ADMIN") return true;
  const teacher = await prisma.teacher.findUnique({ where: { userId: user.id } });
  if (!teacher) return false;
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (cls && cls.classTeacherId === teacher.id) return true;
  const link = await prisma.classSubject.findFirst({
    where: { classId, teacherId: teacher.id },
  });
  return !!link;
}

// Mark attendance for a whole class on one date
router.post("/", authorize("ADMIN", "TEACHER"), async (req, res) => {
  try {
    const { classId, date, records } = req.body;
    const day = parseDate(date);
    if (!Number.isInteger(Number(classId)) || !day || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        message: "classId, a valid date (YYYY-MM-DD) and a list of records are required",
      });
    }
    if (!(await canManageClass(req.user, Number(classId)))) {
      return res.status(403).json({ message: "You can only mark attendance for your own classes" });
    }

    const students = await prisma.student.findMany({
      where: { classId: Number(classId) },
      select: { id: true },
    });
    const validIds = new Set(students.map((s) => s.id));

    for (const r of records) {
      if (!validIds.has(Number(r.studentId))) {
        return res.status(400).json({ message: `Student ${r.studentId} is not in this class` });
      }
      if (!STATUSES.includes(r.status)) {
        return res.status(400).json({ message: `Status must be one of: ${STATUSES.join(", ")}` });
      }
    }

    await prisma.$transaction(
      records.map((r) =>
        prisma.attendance.upsert({
          where: { studentId_date: { studentId: Number(r.studentId), date: day } },
          update: { status: r.status, remark: r.remark || null, markedById: req.user.id },
          create: {
            studentId: Number(r.studentId),
            date: day,
            status: r.status,
            remark: r.remark || null,
            markedById: req.user.id,
          },
        })
      )
    );

    res.status(201).json({ message: `Attendance saved for ${records.length} student(s)` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// See a class's attendance for one date
router.get("/", authorize("ADMIN", "TEACHER"), async (req, res) => {
  try {
    const classId = Number(req.query.classId);
    const day = parseDate(req.query.date);
    if (!Number.isInteger(classId) || !day) {
      return res.status(400).json({ message: "classId and a valid date (YYYY-MM-DD) are required" });
    }
    if (!(await canManageClass(req.user, classId))) {
      return res.status(403).json({ message: "You can only view your own classes" });
    }

    const students = await prisma.student.findMany({
    where: { classId, user: { isActive: true } },
      include: {
        user: { select: { name: true } },
        attendance: { where: { date: day } },
      },
      orderBy: { rollNumber: "asc" },
    });

    res.json(
      students.map((s) => ({
        studentId: s.id,
        rollNumber: s.rollNumber,
        name: s.user.name,
        status: s.attendance[0]?.status ?? null,
        remark: s.attendance[0]?.remark ?? null,
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// One student's history and summary
router.get("/student/:studentId", async (req, res) => {
  try {
    const studentId = Number(req.params.studentId);
    if (!Number.isInteger(studentId)) {
      return res.status(400).json({ message: "Invalid student id" });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { parent: true },
    });
    if (!student) {
  return req.user.role === "ADMIN"
    ? res.status(404).json({ message: "Student not found" })
    : res.status(403).json({ message: "You do not have permission to view this student" });
}

    const { role, id } = req.user;
    let allowed = false;
    if (role === "ADMIN") allowed = true;
    else if (role === "STUDENT") allowed = student.userId === id;
    else if (role === "PARENT") allowed = student.parent?.userId === id;
    else if (role === "TEACHER" && student.classId) {
      allowed = await canManageClass(req.user, student.classId);
    }
    if (!allowed) {
      return res.status(403).json({ message: "You do not have permission to view this student" });
    }

    const dateFilter = {};
    if (req.query.from) {
      const from = parseDate(req.query.from);
      if (!from) return res.status(400).json({ message: "from must be YYYY-MM-DD" });
      dateFilter.gte = from;
    }
    if (req.query.to) {
      const to = parseDate(req.query.to);
      if (!to) return res.status(400).json({ message: "to must be YYYY-MM-DD" });
      dateFilter.lte = to;
    }

    const records = await prisma.attendance.findMany({
      where: { studentId, ...(Object.keys(dateFilter).length && { date: dateFilter }) },
      orderBy: { date: "desc" },
      select: { date: true, status: true, remark: true },
    });

    const count = (status) => records.filter((r) => r.status === status).length;
    const total = records.length;
    const attended = count("PRESENT") + count("LATE");

    res.json({
      summary: {
        total,
        present: count("PRESENT"),
        absent: count("ABSENT"),
        late: count("LATE"),
        leave: count("LEAVE"),
        percentage: total ? Math.round((attended / total) * 1000) / 10 : null,
      },
      records,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;