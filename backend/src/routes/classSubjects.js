import { Router } from "express";
import prisma from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

router.get("/", authorize("ADMIN"), async (req, res) => {
  try {
    const classId = req.query.classId ? Number(req.query.classId) : undefined;
    const items = await prisma.classSubject.findMany({
      where: classId ? { classId } : {},
      include: {
        class: true,
        subject: true,
        teacher: { include: { user: { select: { name: true } } } },
      },
      orderBy: [{ classId: "asc" }, { subjectId: "asc" }],
    });
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.post("/", authorize("ADMIN"), async (req, res) => {
  try {
    const classId = Number(req.body.classId);
    const subjectId = Number(req.body.subjectId);
    const teacherId = req.body.teacherId ? Number(req.body.teacherId) : null;

    if (!Number.isInteger(classId) || !Number.isInteger(subjectId)) {
      return res.status(400).json({ message: "classId and subjectId are required" });
    }

    const item = await prisma.classSubject.upsert({
      where: { classId_subjectId: { classId, subjectId } },
      update: { teacherId },
      create: { classId, subjectId, teacherId },
    });
    res.status(201).json(item);
  } catch (error) {
    if (error.code === "P2003") {
      return res.status(400).json({ message: "The class, subject or teacher does not exist" });
    }
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.delete("/:id", authorize("ADMIN"), async (req, res) => {
  try {
    await prisma.classSubject.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "Removed" });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ message: "Not found" });
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;