import "dotenv/config";
import readline from "node:readline/promises";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";

const mode = process.argv[2];
if (mode !== "clear" && mode !== "seed") {
  console.error("Use: npm run demo:clear   or   npm run demo:seed");
  process.exit(1);
}
if (process.env.NODE_ENV === "production") {
  console.error("This script deletes data, so it will not run when NODE_ENV is production.");
  process.exit(1);
}

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
const PERIODS = [
  ["08:00", "08:45"],
  ["08:45", "09:30"],
  ["09:45", "10:30"],
  ["10:30", "11:15"],
];
// name, code, index of the teacher who teaches it
const SUBJECTS = [
  ["Mathematics", "MATH", 0],
  ["English", "ENG", 1],
  ["Science", "SCI", 2],
  ["Urdu", "URD", 3],
  ["Computer Science", "CS", 0],
];
const TEACHERS = [
  ["Sana Iqbal", "MSc Mathematics"],
  ["Bilal Raza", "MA English"],
  ["Hina Farooq", "MSc Physics"],
  ["Usman Tariq", "MA Urdu"],
];
const CLASSES = [
  { name: "Grade 5", section: "A", teacher: 0, prefix: "G5A", birthYear: 2015 },
  { name: "Grade 6", section: "A", teacher: 1, prefix: "G6A", birthYear: 2014 },
];
const PARENTS = [
  "Kamran Siddiqui",
  "Nadia Hussain",
  "Imtiaz Qureshi",
  "Farah Mirza",
  "Adeel Anwar",
  "Rabia Shah",
];
// name, class index, parent index
const STUDENTS = [
  ["Ayaan Siddiqui", 0, 0],
  ["Zara Siddiqui", 0, 0],
  ["Hamna Hussain", 0, 1],
  ["Rayyan Qureshi", 0, 2],
  ["Mahnoor Mirza", 0, 3],
  ["Daniyal Anwar", 0, 4],
  ["Iqra Shah", 1, 5],
  ["Saad Hussain", 1, 1],
  ["Eman Qureshi", 1, 2],
  ["Taha Mirza", 1, 3],
];

function gradeFor(percentage) {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  if (percentage >= 40) return "E";
  return "F";
}

function dateOnly(daysFromToday) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function lastSchoolDays(count) {
  const days = [];
  let back = 1;
  while (days.length < count) {
    const d = dateOnly(-back);
    const weekday = d.getUTCDay();
    if (weekday !== 0 && weekday !== 6) days.push(d);
    back += 1;
  }
  return days;
}

function databaseName() {
  try {
    return new URL(process.env.DATABASE_URL).pathname.replace("/", "");
  } catch {
    return "unknown";
  }
}

async function clearData() {
  await prisma.$transaction([
    prisma.payment.deleteMany(),
    prisma.fee.deleteMany(),
    prisma.examResult.deleteMany(),
    prisma.exam.deleteMany(),
    prisma.attendance.deleteMany(),
    prisma.timetableSlot.deleteMany(),
    prisma.classSubject.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.announcement.deleteMany(),
    prisma.student.deleteMany(),
    prisma.parent.deleteMany(),
    prisma.teacher.deleteMany(),
    prisma.class.deleteMany(),
    prisma.subject.deleteMany(),
    prisma.user.deleteMany({ where: { role: { not: "ADMIN" } } }),
  ]);
}

async function seedData() {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("No admin account found. Run npm run create-admin first.");

  const password = await bcrypt.hash(process.env.DEMO_PASSWORD, 10);

  const subjects = [];
  for (const [name, code] of SUBJECTS) {
    subjects.push(await prisma.subject.create({ data: { name, code } }));
  }

  const teachers = [];
  for (const [i, [name, qualification]] of TEACHERS.entries()) {
    teachers.push(
      await prisma.user.create({
        data: {
          name,
          email: `teacher${i + 1}@demo.test`,
          password,
          role: "TEACHER",
          teacher: { create: { phone: `0300 000000${i + 1}`, qualification } },
        },
        include: { teacher: true },
      })
    );
  }

  const classes = [];
  for (const c of CLASSES) {
    classes.push(
      await prisma.class.create({
        data: {
          name: c.name,
          section: c.section,
          classTeacherId: teachers[c.teacher].teacher.id,
        },
      })
    );
  }

  const parents = [];
  for (const [i, name] of PARENTS.entries()) {
    parents.push(
      await prisma.user.create({
        data: {
          name,
          email: `parent${i + 1}@demo.test`,
          password,
          role: "PARENT",
          parent: { create: { phone: `0301 000000${i + 1}` } },
        },
        include: { parent: true },
      })
    );
  }

  const rollCount = CLASSES.map(() => 0);
  const students = [];
  for (const [i, [name, ci, pi]] of STUDENTS.entries()) {
    rollCount[ci] += 1;
    const rollNumber = `${CLASSES[ci].prefix}-${String(rollCount[ci]).padStart(2, "0")}`;
    const user = await prisma.user.create({
      data: {
        name,
        email: `student${i + 1}@demo.test`,
        password,
        role: "STUDENT",
        student: {
          create: {
            rollNumber,
            dateOfBirth: new Date(Date.UTC(CLASSES[ci].birthYear, i % 12, 5 + i)),
            classId: classes[ci].id,
            parentId: parents[pi].parent.id,
          },
        },
      },
      include: { student: true },
    });
    students.push({ id: user.student.id, ci });
  }

  const classSubjects = classes.map(() => []);
  for (const [ci, cls] of classes.entries()) {
    for (const [si, subject] of subjects.entries()) {
      classSubjects[ci].push(
        await prisma.classSubject.create({
          data: {
            classId: cls.id,
            subjectId: subject.id,
            teacherId: teachers[SUBJECTS[si][2]].teacher.id,
          },
        })
      );
    }
  }

  // Each class gets 4 lessons a day. The second class is shifted by 2 subjects,
  // so no teacher is ever needed in both classes at the same time.
  const slots = [];
  for (const [ci] of classes.entries()) {
    DAYS.forEach((day, d) => {
      PERIODS.forEach(([startTime, endTime], p) => {
        const si = (d + p + (ci === 0 ? 0 : 2)) % SUBJECTS.length;
        slots.push({ classSubjectId: classSubjects[ci][si].id, day, startTime, endTime });
      });
    });
  }
  await prisma.timetableSlot.createMany({ data: slots });

  for (const [ci, cls] of classes.entries()) {
    const exam = await prisma.exam.create({
      data: { name: "Midterm exam", classId: cls.id, date: dateOnly(-20) },
    });
    const results = [];
    students
      .filter((s) => s.ci === ci)
      .forEach((s, n) => {
        subjects.forEach((subject, j) => {
          const marks = 55 + ((n * 7 + j * 11 + ci * 5) % 41);
          results.push({
            examId: exam.id,
            studentId: s.id,
            subjectId: subject.id,
            marks,
            totalMarks: 100,
            grade: gradeFor(marks),
          });
        });
      });
    await prisma.examResult.createMany({ data: results });
  }

  const days = lastSchoolDays(10);
  const attendance = [];
  students.forEach((s, gi) => {
    days.forEach((date, k) => {
      const roll = (gi * 3 + k * 5) % 13;
      const status =
        roll === 0 ? "ABSENT" : roll === 1 ? "LATE" : roll === 2 ? "LEAVE" : "PRESENT";
      attendance.push({
        studentId: s.id,
        date,
        status,
        markedById: teachers[CLASSES[s.ci].teacher].id,
      });
    });
  });
  await prisma.attendance.createMany({ data: attendance });

  for (const [gi, s] of students.entries()) {
    const part = gi % 3;
    await prisma.fee.create({
      data: {
        studentId: s.id,
        title: "Tuition fee",
        amount: "5000.00",
        dueDate: dateOnly(7),
        status: part === 0 ? "PAID" : part === 1 ? "PARTIAL" : "UNPAID",
        payments:
          part === 2
            ? undefined
            : {
                create: {
                  amount: part === 0 ? "5000.00" : "2000.00",
                  method: part === 0 ? "CASH" : "BANK_TRANSFER",
                  note: part === 0 ? "Paid in full" : "First instalment",
                },
              },
      },
    });
    const libraryPaid = gi % 2 === 0;
    await prisma.fee.create({
      data: {
        studentId: s.id,
        title: "Library fee",
        amount: "500.00",
        dueDate: dateOnly(-14),
        status: libraryPaid ? "PAID" : "UNPAID",
        payments: libraryPaid
          ? { create: { amount: "500.00", method: "CASH", note: "Paid at the office" } }
          : undefined,
      },
    });
  }

  const roleTargets = {
    ALL: ["ADMIN", "TEACHER", "STUDENT", "PARENT"],
    TEACHERS: ["TEACHER"],
    STUDENTS: ["STUDENT"],
    PARENTS: ["PARENT"],
  };
  const notices = [
    {
      title: "Welcome back to school",
      message:
        "We wish all students and families a great term. Please check the timetable and the fee schedule.",
      audience: "ALL",
      author: admin.id,
    },
    {
      title: "Midterm results are published",
      message: "Parents can now see the midterm results under Results.",
      audience: "PARENTS",
      author: teachers[0].id,
    },
    {
      title: "Sports day on Friday",
      message: "Students should wear their sports uniform and bring a water bottle.",
      audience: "STUDENTS",
      author: admin.id,
    },
  ];
  for (const n of notices) {
    await prisma.announcement.create({
      data: { title: n.title, message: n.message, audience: n.audience, createdById: n.author },
    });
    const recipients = await prisma.user.findMany({
      where: { isActive: true, role: { in: roleTargets[n.audience] }, id: { not: n.author } },
      select: { id: true },
    });
    await prisma.notification.createMany({
      data: recipients.map((r) => ({
        userId: r.id,
        title: n.title,
        message: n.message.slice(0, 200),
      })),
    });
  }

  console.log("Demo data created.");
  console.log("Demo logins (the password is DEMO_PASSWORD from your .env):");
  console.log("  Teacher: teacher1@demo.test  (class teacher of Grade 5 A)");
  console.log("  Parent:  parent1@demo.test   (two children)");
  console.log("  Student: student1@demo.test");
}

async function main() {
  if (mode === "seed" && !process.env.DEMO_PASSWORD) {
    console.error("Add DEMO_PASSWORD=some_password to backend/.env first.");
    process.exitCode = 1;
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    `Database: ${databaseName()}\n` +
      "This deletes ALL teachers, parents, students, classes, subjects, exams, fees and\n" +
      "announcements. Only the admin account is kept.\n" +
      "Type YES to continue: "
  );
  rl.close();
  if (answer.trim() !== "YES") {
    console.log("Cancelled. Nothing was changed.");
    return;
  }

  await clearData();
  console.log("Cleared. The admin account was kept.");
  if (mode === "seed") await seedData();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(process.exitCode ?? 0);
  });