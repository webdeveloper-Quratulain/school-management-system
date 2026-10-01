import { Router } from "express";
import prisma from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function toId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

const slotInclude = {
  classSubject: {
    include: {
      class: true,
      subject: true,
      teacher: { include: { user: { select: { name: true } } } },
    },
  },
};

function shape(slot) {
  const cs = slot.classSubject;
  return {
    id: slot.id,
    day: slot.day,
    startTime: slot.startTime,
    endTime: slot.endTime,
    classSubjectId: slot.classSubjectId,
    class: { id: cs.class.id, name: cs.class.name, section: cs.class.section },
    subject: { id: cs.subject.id, name: cs.subject.name },
    teacher: cs.teacher ? cs.teacher.user.name : null,
  };
}

function checkTimes(day, startTime, endTime) {
  if (!DAYS.includes(day)) return `day must be one of: ${DAYS.join(", ")}`;
  if (!TIME.test(startTime) || !TIME.test(endTime)) {
    return "startTime and endTime must be in 24-hour HH:MM format, like 08:30";
  }
  if (startTime >= endTime) return "startTime must be earlier than endTime";
  return null;
}

// Looks for a lesson that overlaps in the same class or with the same teacher
async function findConflict({ day, startTime, endTime, classId, teacherId, excludeId }) {
  const sameDay = await prisma.timetableSlot.findMany({
    where: {
      day,
      ...(excludeId && { id: { not: excludeId } }),
      classSubject: {
        OR: [{ classId }, ...(teacherId ? [{ teacherId }] : [])],
      },
    },
    include: { classSubject: { include: { class: true, subject: true } } },
  });

  const overlapping = sameDay.filter((s) => startTime < s.endTime && s.startTime < endTime);
  const inClass = overlapping.find((s) => s.classSubject.classId === classId);
  if (inClass) {
    return `This class already has ${inClass.classSubject.subject.name} from ${inClass.startTime} to ${inClass.endTime} on that day`;
  }
  const withTeacher = overlapping[0];
  if (withTeacher) {
    const c = withTeacher.classSubject.class;
    return `The teacher is already teaching ${c.name} ${c.section} from ${withTeacher.startTime} to ${withTeacher.endTime} on that day`;
  }
  return null;
}

async function teacherInClass(user, classId) {
  const teacher = await prisma.teacher.findUnique({ where: { userId: user.id } });
  if (!teacher) return false;
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (cls?.classTeacherId === teacher.id) return true;
  const link = await prisma.classSubject.findFirst({
    where: { classId, teacherId: teacher.id },
  });
  return !!link;
}

async function canViewClass(user, classId) {
  if (user.role === "ADMIN") return true;
  if (user.role === "TEACHER") return teacherInClass(user, classId);
  if (user.role === "STUDENT") {
    const student = await prisma.student.findUnique({ where: { userId: user.id } });
    return student?.classId === classId;
  }
  if (user.role === "PARENT") {
    const count = await prisma.student.count({
      where: { classId, parent: { userId: user.id } },
    });
    return count > 0;
  }
  return false;
}

const slotOrder = [{ day: "asc" }, { startTime: "asc" }];

// The logged-in teacher's or student's own timetable
router.get("/me", authorize("TEACHER", "STUDENT"), async (req, res) => {
  try {
    let where;
    if (req.user.role === "TEACHER") {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      if (!teacher) return res.json([]);
      where = { classSubject: { teacherId: teacher.id } };
    } else {
      const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
      if (!student?.classId) return res.json([]);
      where = { classSubject: { classId: student.classId } };
    }
    const slots = await prisma.timetableSlot.findMany({
      where,
      include: slotInclude,
      orderBy: slotOrder,
    });
    res.json(slots.map(shape));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// A class's timetable (also the way parents see their child's timetable)
router.get("/class/:classId", async (req, res) => {
  try {
    const classId = toId(req.params.classId);
    if (!classId) return res.status(400).json({ message: "Invalid class id" });

    if (!(await canViewClass(req.user, classId))) {
      return res.status(403).json({ message: "You do not have permission to view this timetable" });
    }

    const slots = await prisma.timetableSlot.findMany({
      where: { classSubject: { classId } },
      include: slotInclude,
      orderBy: slotOrder,
    });
    res.json(slots.map(shape));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.post("/", authorize("ADMIN"), async (req, res) => {
  try {
    const classSubjectId = toId(req.body.classSubjectId);
    const { day, startTime, endTime } = req.body;
    if (!classSubjectId) return res.status(400).json({ message: "classSubjectId is required" });

    const problem = checkTimes(day, startTime, endTime);
    if (problem) return res.status(400).json({ message: problem });

    const cs = await prisma.classSubject.findUnique({ where: { id: classSubjectId } });
    if (!cs) return res.status(400).json({ message: "That class-subject does not exist" });

    const conflict = await findConflict({
      day, startTime, endTime, classId: cs.classId, teacherId: cs.teacherId,
    });
    if (conflict) return res.status(409).json({ message: conflict });

    const slot = await prisma.timetableSlot.create({
      data: { classSubjectId, day, startTime, endTime },
      include: slotInclude,
    });
    res.status(201).json(shape(slot));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.put("/:id", authorize("ADMIN"), async (req, res) => {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid slot id" });

    const existing = await prisma.timetableSlot.findUnique({
      where: { id },
      include: { classSubject: true },
    });
    if (!existing) return res.status(404).json({ message: "Slot not found" });

    const day = req.body.day ?? existing.day;
    const startTime = req.body.startTime ?? existing.startTime;
    const endTime = req.body.endTime ?? existing.endTime;

    const problem = checkTimes(day, startTime, endTime);
    if (problem) return res.status(400).json({ message: problem });

    const conflict = await findConflict({
      day,
      startTime,
      endTime,
      classId: existing.classSubject.classId,
      teacherId: existing.classSubject.teacherId,
      excludeId: id,
    });
    if (conflict) return res.status(409).json({ message: conflict });

    const slot = await prisma.timetableSlot.update({
      where: { id },
      data: { day, startTime, endTime },
      include: slotInclude,
    });
    res.json(shape(slot));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.delete("/:id", authorize("ADMIN"), async (req, res) => {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid slot id" });
    await prisma.timetableSlot.delete({ where: { id } });
    res.json({ message: "Slot deleted" });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ message: "Slot not found" });
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;