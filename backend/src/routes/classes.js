import { Router } from "express";
import prisma from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

router.get("/", authorize("ADMIN", "TEACHER"), async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      include: { _count: { select: { students: true } } },
      orderBy: [{ name: "asc" }, { section: "asc" }],
    });
    res.json(classes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});
router.get("/mine", authorize("TEACHER"), async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
    if (!teacher) return res.json([]);

    const classes = await prisma.class.findMany({
      where: {
        OR: [
          { classTeacherId: teacher.id },
          { classSubjects: { some: { teacherId: teacher.id } } },
        ],
      },
      include: {
        classSubjects: {
          where: { teacherId: teacher.id },
          include: { subject: true },
        },
      },
      orderBy: [{ name: "asc" }, { section: "asc" }],
    });

    res.json(
      classes.map((c) => ({
        id: c.id,
        name: c.name,
        section: c.section,
        isClassTeacher: c.classTeacherId === teacher.id,
        subjects: c.classSubjects.map((cs) => ({ id: cs.subject.id, name: cs.subject.name })),
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.post("/", authorize("ADMIN"), async (req, res) => {
  try {
    const { name, section, classTeacherId } = req.body;
    if (!name || !section) {
      return res.status(400).json({ message: "Name and section are required" });
    }
    const created = await prisma.class.create({
      data: {
        name: name.trim(),
        section: section.trim(),
        classTeacherId: classTeacherId || null,
      },
    });
    res.status(201).json(created);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "This class and section already exist" });
    }
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.put("/:id", authorize("ADMIN"), async (req, res) => {
  try {
    const { name, section, classTeacherId } = req.body;
    const updated = await prisma.class.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(name && { name: name.trim() }),
        ...(section && { section: section.trim() }),
        ...(classTeacherId !== undefined && { classTeacherId: classTeacherId || null }),
      },
    });
    res.json(updated);
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ message: "Class not found" });
    if (error.code === "P2002") {
      return res.status(409).json({ message: "This class and section already exist" });
    }
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.delete("/:id", authorize("ADMIN"), async (req, res) => {
  try {
    await prisma.class.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "Class deleted" });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ message: "Class not found" });
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;