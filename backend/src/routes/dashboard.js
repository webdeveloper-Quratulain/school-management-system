import { Router } from "express";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

const WEEKDAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

const visibleTo = {
  TEACHER: ["ALL", "TEACHERS"],
  STUDENT: ["ALL", "STUDENTS"],
  PARENT: ["ALL", "PARENTS"],
};

function parseDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(value);
  if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return null;
  return d;
}

const centsOf = (decimal) => Math.round(Number(decimal) * 100);

function recentAnnouncements(user) {
  const where =
    user.role === "ADMIN"
      ? {}
      : { OR: [{ audience: { in: visibleTo[user.role] } }, { createdById: user.id }] };
  return prisma.announcement.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 3,
    select: {
      id: true,
      title: true,
      message: true,
      audience: true,
      createdAt: true,
      createdBy: { select: { name: true } },
    },
  });
}

async function adminData(day) {
  const [students, teachers, parents, classes, enrolled, grouped, billed, collected, overdue] =
    await Promise.all([
      prisma.student.count({ where: { user: { isActive: true } } }),
      prisma.teacher.count({ where: { user: { isActive: true } } }),
      prisma.parent.count({ where: { user: { isActive: true } } }),
      prisma.class.count(),
      prisma.student.count({ where: { classId: { not: null }, user: { isActive: true } } }),
      prisma.attendance.groupBy({
        by: ["status"],
        where: { date: day, student: { user: { isActive: true } } },
        _count: { _all: true },
      }),
      prisma.fee.aggregate({ _sum: { amount: true } }),
      prisma.payment.aggregate({ _sum: { amount: true } }),
      prisma.fee.count({ where: { status: { not: "PAID" }, dueDate: { lt: day } } }),
    ]);

  const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0 };
  for (const g of grouped) counts[g.status] = g._count._all;
  const marked = counts.PRESENT + counts.ABSENT + counts.LATE + counts.LEAVE;

  const billedCents = centsOf(billed._sum.amount ?? 0);
  const collectedCents = centsOf(collected._sum.amount ?? 0);

  return {
    counts: { students, teachers, parents, classes },
    attendanceToday: { enrolled, marked, ...counts },
    fees: {
      billed: billedCents / 100,
      collected: collectedCents / 100,
      outstanding: (billedCents - collectedCents) / 100,
      overdueCount: overdue,
    },
  };
}

async function teacherData(user, day) {
  const teacher = await prisma.teacher.findUnique({ where: { userId: user.id } });
  if (!teacher) return { classCount: 0, lessonsToday: [], headClasses: [] };

  const weekday = WEEKDAYS[day.getUTCDay()];
  const [classCount, lessons, headClasses] = await Promise.all([
    prisma.class.count({
      where: {
        OR: [{ classTeacherId: teacher.id }, { classSubjects: { some: { teacherId: teacher.id } } }],
      },
    }),
    prisma.timetableSlot.findMany({
      where: { day: weekday, classSubject: { teacherId: teacher.id } },
      include: { classSubject: { include: { class: true, subject: true } } },
      orderBy: { startTime: "asc" },
    }),
    prisma.class.findMany({
      where: { classTeacherId: teacher.id },
      include: {
        students: {
          where: { user: { isActive: true } },
          select: { id: true, attendance: { where: { date: day }, select: { id: true } } },
        },
      },
      orderBy: [{ name: "asc" }, { section: "asc" }],
    }),
  ]);

  return {
    classCount,
    lessonsToday: lessons.map((s) => ({
      id: s.id,
      subject: s.classSubject.subject.name,
      class: `${s.classSubject.class.name} ${s.classSubject.class.section}`,
      startTime: s.startTime,
      endTime: s.endTime,
    })),
    headClasses: headClasses.map((c) => ({
      id: c.id,
      name: `${c.name} ${c.section}`,
      students: c.students.length,
      marked: c.students.filter((s) => s.attendance.length > 0).length,
    })),
  };
}

async function familyData(user, day) {
  const owner =
    user.role === "STUDENT" ? { userId: user.id } : { parent: { userId: user.id } };
  const students = await prisma.student.findMany({
    where: { ...owner, user: { isActive: true } },
    include: {
      user: { select: { name: true } },
      class: true,
      fees: { include: { payments: true } },
    },
    orderBy: { rollNumber: "asc" },
  });

  const weekday = WEEKDAYS[day.getUTCDay()];

  const children = await Promise.all(
    students.map(async (s) => {
      const [grouped, lessons] = await Promise.all([
        prisma.attendance.groupBy({
          by: ["status"],
          where: { studentId: s.id },
          _count: { _all: true },
        }),
        s.classId
          ? prisma.timetableSlot.findMany({
              where: { day: weekday, classSubject: { classId: s.classId } },
              include: {
                classSubject: {
                  include: {
                    subject: true,
                    teacher: { include: { user: { select: { name: true } } } },
                  },
                },
              },
              orderBy: { startTime: "asc" },
            })
          : [],
      ]);

      const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0 };
      for (const g of grouped) counts[g.status] = g._count._all;
      const total = counts.PRESENT + counts.ABSENT + counts.LATE + counts.LEAVE;
      const attended = counts.PRESENT + counts.LATE;

      const billedCents = s.fees.reduce((sum, f) => sum + centsOf(f.amount), 0);
      const paidCents = s.fees.reduce(
        (sum, f) => sum + f.payments.reduce((p, x) => p + centsOf(x.amount), 0),
        0
      );

      return {
        id: s.id,
        name: s.user.name,
        className: s.class ? `${s.class.name} ${s.class.section}` : null,
        attendanceDays: total,
        attendancePercentage: total ? Math.round((attended / total) * 1000) / 10 : null,
        feeBalance: (billedCents - paidCents) / 100,
        overdueFees: s.fees.filter((f) => f.status !== "PAID" && f.dueDate < day).length,
        lessonsToday: lessons.map((l) => ({
          id: l.id,
          subject: l.classSubject.subject.name,
          teacher: l.classSubject.teacher ? l.classSubject.teacher.user.name : null,
          startTime: l.startTime,
          endTime: l.endTime,
        })),
      };
    })
  );

  return { children };
}

router.get("/", async (req, res) => {
  try {
    const day = parseDate(req.query.date);
    if (!day) return res.status(400).json({ message: "date must be YYYY-MM-DD" });

    const announcements = await recentAnnouncements(req.user);

    let data;
    if (req.user.role === "ADMIN") data = await adminData(day);
    else if (req.user.role === "TEACHER") data = await teacherData(req.user, day);
    else data = await familyData(req.user, day);

    res.json({ role: req.user.role, announcements, ...data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;