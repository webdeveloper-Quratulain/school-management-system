import { Router } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);
router.get("/mine", authorize("STUDENT", "PARENT"), async (req, res) => {
  try {
    const owner =
      req.user.role === "STUDENT"
        ? { userId: req.user.id }
        : { parent: { userId: req.user.id } };

    const students = await prisma.student.findMany({
      where: { ...owner, user: { isActive: true } },
      include: {
        class: true,
        user: { select: { name: true } },
      },
      orderBy: { rollNumber: "asc" },
    });

    res.json(
      students.map((s) => ({
        id: s.id,
        name: s.user.name,
        rollNumber: s.rollNumber,
        classId: s.classId,
        class: s.class
          ? { id: s.class.id, name: s.class.name, section: s.class.section }
          : null,
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

const userFields = { id: true, name: true, email: true, isActive: true };

router.get("/", authorize("ADMIN", "TEACHER"), async (req, res) => {
  try {
    const classId = req.query.classId ? Number(req.query.classId) : null;
    if (req.query.classId && !Number.isInteger(classId)) {
      return res.status(400).json({ message: "Invalid classId" });
    }

    if (req.user.role === "TEACHER") {
      if (!classId) return res.status(400).json({ message: "classId is required" });
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      const allowed =
        teacher &&
        (await prisma.class.count({
          where: {
            id: classId,
            OR: [
              { classTeacherId: teacher.id },
              { classSubjects: { some: { teacherId: teacher.id } } },
            ],
          },
        })) > 0;
      if (!allowed) {
        return res.status(403).json({ message: "You can only view your own classes" });
      }
    }

    const students = await prisma.student.findMany({
      where: classId ? { classId } : {},
      include: {
        user: { select: userFields },
        class: true,
        parent: { include: { user: { select: { name: true } } } },
      },
      orderBy: { rollNumber: "asc" },
    });
    res.json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.post("/", authorize("ADMIN"), async (req, res) => {
  try {
    const { name, email, password, rollNumber, dateOfBirth, classId, parentId } = req.body;
    if (!name || !email || !password || !rollNumber) {
      return res.status(400).json({ message: "Name, email, password and roll number are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashed,
        role: "STUDENT",
        student: {
          create: {
            rollNumber: String(rollNumber).trim(),
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            classId: classId || null,
            parentId: parentId || null,
          },
        },
      },
      include: { student: true },
    });

    const { password: _hidden, ...safeUser } = user;
    res.status(201).json(safeUser);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "This email or roll number is already in use" });
    }
    if (error.code === "P2003") {
      return res.status(400).json({ message: "The class or parent you selected does not exist" });
    }
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.put("/:id", authorize("ADMIN"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid student id" });

    const { name, email, rollNumber, dateOfBirth, classId, parentId } = req.body;

    const classValue = classId === undefined ? undefined : classId ? Number(classId) : null;
    const parentValue = parentId === undefined ? undefined : parentId ? Number(parentId) : null;
    if (
      (classValue && !Number.isInteger(classValue)) ||
      (parentValue && !Number.isInteger(parentValue))
    ) {
      return res.status(400).json({ message: "Invalid class or parent" });
    }
    if (classValue && !(await prisma.class.findUnique({ where: { id: classValue } }))) {
      return res.status(400).json({ message: "The class you selected does not exist" });
    }
    if (parentValue && !(await prisma.parent.findUnique({ where: { id: parentValue } }))) {
      return res.status(400).json({ message: "The parent you selected does not exist" });
    }

    let dob;
    if (dateOfBirth !== undefined) {
      if (dateOfBirth === null || dateOfBirth === "") {
        dob = null;
      } else {
        const d = new Date(dateOfBirth);
        if (isNaN(d.getTime())) {
          return res.status(400).json({ message: "Date of birth is not a valid date" });
        }
        dob = d;
      }
    }

    const student = await prisma.student.update({
      where: { id },
      data: {
        ...(rollNumber && { rollNumber: String(rollNumber).trim() }),
        ...(dob !== undefined && { dateOfBirth: dob }),
        ...(classValue !== undefined && {
          class: classValue ? { connect: { id: classValue } } : { disconnect: true },
        }),
        ...(parentValue !== undefined && {
          parent: parentValue ? { connect: { id: parentValue } } : { disconnect: true },
        }),
        user: {
          update: {
            ...(name && { name: name.trim() }),
            ...(email && { email: email.toLowerCase().trim() }),
          },
        },
      },
      include: { user: { select: userFields }, class: true },
    });
    res.json(student);
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ message: "Student not found" });
    if (error.code === "P2002") {
      return res.status(409).json({ message: "This email or roll number is already in use" });
    }
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.delete("/:id", authorize("ADMIN"), async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { id: Number(req.params.id) } });
    if (!student) return res.status(404).json({ message: "Student not found" });

    await prisma.user.update({
      where: { id: student.userId },
      data: { isActive: false },
    });
    res.json({ message: "Student deactivated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;