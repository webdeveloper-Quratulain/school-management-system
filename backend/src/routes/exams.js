import { Router } from "express";
import prisma from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

function toId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function parseDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(value);
  if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return null;
  return d;
}

// Change these cut-offs if the school uses a different grading scale
function gradeFor(percentage) {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  if (percentage >= 40) return "E";
  return "F";
}

const round1 = (n) => Math.round(n * 10) / 10;

async function getTeacher(user) {
  return prisma.teacher.findUnique({ where: { userId: user.id } });
}

async function teacherInClass(user, classId) {
  if (user.role === "ADMIN") return true;
  const teacher = await getTeacher(user);
  if (!teacher) return false;
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (cls?.classTeacherId === teacher.id) return true;
  const link = await prisma.classSubject.findFirst({
    where: { classId, teacherId: teacher.id },
  });
  return !!link;
}

// A student's report card
router.get("/student/:studentId", async (req, res) => {
  try {
    const studentId = toId(req.params.studentId);
    if (!studentId) return res.status(400).json({ message: "Invalid student id" });

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
      allowed = await teacherInClass(req.user, student.classId);
    }
    if (!allowed) {
      return res.status(403).json({ message: "You do not have permission to view this student" });
    }

    const results = await prisma.examResult.findMany({
      where: { studentId },
      include: { exam: true, subject: true },
      orderBy: [{ exam: { date: "desc" } }, { subjectId: "asc" }],
    });

    const byExam = new Map();
    for (const r of results) {
      if (!byExam.has(r.examId)) {
        byExam.set(r.examId, { examId: r.examId, exam: r.exam.name, date: r.exam.date, subjects: [] });
      }
      byExam.get(r.examId).subjects.push({
        subject: r.subject.name,
        marks: r.marks,
        totalMarks: r.totalMarks,
        percentage: round1((r.marks / r.totalMarks) * 100),
        grade: r.grade,
      });
    }

    const exams = [...byExam.values()].map((e) => {
      const got = e.subjects.reduce((sum, s) => sum + s.marks, 0);
      const max = e.subjects.reduce((sum, s) => sum + s.totalMarks, 0);
      const percentage = round1((got / max) * 100);
      return { ...e, totalObtained: got, totalMax: max, percentage, grade: gradeFor(percentage) };
    });

    res.json(exams);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.get("/", authorize("ADMIN", "TEACHER"), async (req, res) => {
  try {
    const classId = req.query.classId ? toId(req.query.classId) : null;
    if (req.user.role === "TEACHER") {
      if (!classId) return res.status(400).json({ message: "classId is required" });
      if (!(await teacherInClass(req.user, classId))) {
        return res.status(403).json({ message: "You can only view your own classes" });
      }
    }
    const exams = await prisma.exam.findMany({
      where: classId ? { classId } : {},
      include: { class: true },
      orderBy: { date: "desc" },
    });
    res.json(exams);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.post("/", authorize("ADMIN"), async (req, res) => {
  try {
    const { name, date } = req.body;
    const classId = toId(req.body.classId);
    const day = parseDate(date);
    if (typeof name !== "string" || !name.trim() || !classId || !day) {
      return res.status(400).json({ message: "name, classId and a valid date (YYYY-MM-DD) are required" });
    }
    const exam = await prisma.exam.create({
      data: { name: name.trim(), classId, date: day },
    });
    res.status(201).json(exam);
  } catch (error) {
    if (error.code === "P2003") return res.status(400).json({ message: "That class does not exist" });
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.put("/:id", authorize("ADMIN"), async (req, res) => {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid exam id" });
    const { name, date } = req.body;
    let day;
    if (date !== undefined) {
      day = parseDate(date);
      if (!day) return res.status(400).json({ message: "date must be YYYY-MM-DD" });
    }
    const exam = await prisma.exam.update({
      where: { id },
      data: {
        ...(typeof name === "string" && name.trim() && { name: name.trim() }),
        ...(day && { date: day }),
      },
    });
    res.json(exam);
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ message: "Exam not found" });
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.delete("/:id", authorize("ADMIN"), async (req, res) => {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid exam id" });
    await prisma.exam.delete({ where: { id } });
    res.json({ message: "Exam deleted" });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ message: "Exam not found" });
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Enter marks for one subject
router.post("/:id/results", authorize("ADMIN", "TEACHER"), async (req, res) => {
  try {
    const examId = toId(req.params.id);
    const subjectId = toId(req.body.subjectId);
    const totalMarks = req.body.totalMarks === undefined ? 100 : Number(req.body.totalMarks);
    const { records } = req.body;

    if (!examId || !subjectId || !(totalMarks > 0) || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        message: "subjectId, totalMarks (above 0) and a list of records are required",
      });
    }

    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    const link = await prisma.classSubject.findUnique({
      where: { classId_subjectId: { classId: exam.classId, subjectId } },
    });
    if (!link) {
      return res.status(400).json({ message: "This subject is not taught in the exam's class" });
    }

    if (req.user.role === "TEACHER") {
      const teacher = await getTeacher(req.user);
      if (!teacher || link.teacherId !== teacher.id) {
        return res.status(403).json({ message: "You can only enter marks for subjects you teach" });
      }
    }

    const students = await prisma.student.findMany({
      where: { classId: exam.classId },
      select: { id: true },
    });
    const validIds = new Set(students.map((s) => s.id));

    for (const r of records) {
      if (!validIds.has(Number(r.studentId))) {
        return res.status(400).json({ message: `Student ${r.studentId} is not in this class` });
      }
      if (typeof r.marks !== "number" || !Number.isFinite(r.marks) || r.marks < 0 || r.marks > totalMarks) {
        return res.status(400).json({
          message: `Marks for student ${r.studentId} must be a number from 0 to ${totalMarks}`,
        });
      }
    }

    await prisma.$transaction(
      records.map((r) => {
        const grade = gradeFor((r.marks / totalMarks) * 100);
        return prisma.examResult.upsert({
          where: {
            examId_studentId_subjectId: { examId, studentId: Number(r.studentId), subjectId },
          },
          update: { marks: r.marks, totalMarks, grade },
          create: { examId, studentId: Number(r.studentId), subjectId, marks: r.marks, totalMarks, grade },
        });
      })
    );

    res.status(201).json({ message: `Marks saved for ${records.length} student(s)` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// View all results of an exam
router.get("/:id/results", authorize("ADMIN", "TEACHER"), async (req, res) => {
  try {
    const examId = toId(req.params.id);
    if (!examId) return res.status(400).json({ message: "Invalid exam id" });

    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    if (!(await teacherInClass(req.user, exam.classId))) {
      return res.status(403).json({ message: "You can only view your own classes" });
    }

    const subjectId = req.query.subjectId ? toId(req.query.subjectId) : null;
    const results = await prisma.examResult.findMany({
      where: { examId, ...(subjectId && { subjectId }) },
      include: {
        student: { select: { rollNumber: true, user: { select: { name: true } } } },
        subject: { select: { name: true } },
      },
      orderBy: [{ student: { rollNumber: "asc" } }, { subjectId: "asc" }],
    });

    res.json(
      results.map((r) => ({
        studentId: r.studentId,
        rollNumber: r.student.rollNumber,
        name: r.student.user.name,
        subject: r.subject.name,
        marks: r.marks,
        totalMarks: r.totalMarks,
        grade: r.grade,
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;