import { Router } from "express";
import prisma from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();
router.use(authenticate, authorize("ADMIN"));

router.patch("/:id/status", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    if (typeof req.body?.isActive !== "boolean") {
      return res.status(400).json({ message: "isActive must be true or false" });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "ADMIN") {
      return res.status(403).json({ message: "Admin accounts cannot be changed here" });
    }

    await prisma.user.update({ where: { id }, data: { isActive: req.body.isActive } });
    res.json({ message: req.body.isActive ? "Account reactivated" : "Account deactivated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        teacher: { select: { id: true } },
        parent: { select: { id: true } },
        student: { select: { id: true } },
      },
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "ADMIN") {
      return res.status(403).json({ message: "Admin accounts cannot be deleted" });
    }

    const [markedAttendance, postedAnnouncements] = await Promise.all([
      prisma.attendance.count({ where: { markedById: id } }),
      prisma.announcement.count({ where: { createdById: id } }),
    ]);
    if (markedAttendance > 0 || postedAnnouncements > 0) {
      return res.status(409).json({
        message:
          "This person has marked attendance or posted announcements, so they cannot be deleted. Deactivate them instead.",
      });
    }

    if (user.student) {
      const [attendance, results, fees] = await Promise.all([
        prisma.attendance.count({ where: { studentId: user.student.id } }),
        prisma.examResult.count({ where: { studentId: user.student.id } }),
        prisma.fee.count({ where: { studentId: user.student.id } }),
      ]);
      if (attendance + results + fees > 0) {
        return res.status(409).json({
          message:
            "This student already has attendance, marks or fee records, so they cannot be deleted. Deactivate them instead.",
        });
      }
    }

    if (user.teacher) {
      const [headOf, subjects] = await Promise.all([
        prisma.class.count({ where: { classTeacherId: user.teacher.id } }),
        prisma.classSubject.count({ where: { teacherId: user.teacher.id } }),
      ]);
      if (headOf + subjects > 0) {
        return res.status(409).json({
          message:
            "This teacher is still assigned to classes or subjects. Remove those assignments first, or deactivate them instead.",
        });
      }
    }

    if (user.parent) {
      const children = await prisma.student.count({ where: { parentId: user.parent.id } });
      if (children > 0) {
        return res.status(409).json({
          message:
            "This parent still has children linked. Unlink them first, or deactivate the parent instead.",
        });
      }
    }

    await prisma.user.delete({ where: { id } });
    res.json({ message: "Deleted" });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ message: "User not found" });
    if (error.code === "P2003") {
      return res.status(409).json({
        message: "This person is still linked to other records, so they cannot be deleted. Deactivate them instead.",
      });
    }
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;