import { Router } from "express";
import prisma from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

const AUDIENCES = ["ALL", "TEACHERS", "STUDENTS", "PARENTS"];

const visibleTo = {
  TEACHER: ["ALL", "TEACHERS"],
  STUDENT: ["ALL", "STUDENTS"],
  PARENT: ["ALL", "PARENTS"],
};

const recipientRoles = {
  ALL: ["ADMIN", "TEACHER", "STUDENT", "PARENT"],
  TEACHERS: ["TEACHER"],
  STUDENTS: ["STUDENT"],
  PARENTS: ["PARENT"],
};

router.get("/", async (req, res) => {
  try {
    const where =
      req.user.role === "ADMIN"
        ? {}
        : {
            OR: [
              { audience: { in: visibleTo[req.user.role] } },
              { createdById: req.user.id },
            ],
          };

    const items = await prisma.announcement.findMany({
      where,
      include: { createdBy: { select: { name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.post("/", authorize("ADMIN", "TEACHER"), async (req, res) => {
  try {
    const { title, message, audience = "ALL" } = req.body;

    if (typeof title !== "string" || typeof message !== "string" || !title.trim() || !message.trim()) {
      return res.status(400).json({ message: "Title and message are required" });
    }
    if (title.trim().length > 150 || message.trim().length > 2000) {
      return res.status(400).json({ message: "Title max 150 characters, message max 2000" });
    }
    if (!AUDIENCES.includes(audience)) {
      return res.status(400).json({ message: `Audience must be one of: ${AUDIENCES.join(", ")}` });
    }
    if (req.user.role === "TEACHER" && !["STUDENTS", "PARENTS"].includes(audience)) {
      return res.status(403).json({ message: "Teachers can only post to students or parents" });
    }

    const recipients = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: recipientRoles[audience] },
        id: { not: req.user.id },
      },
      select: { id: true },
    });

    const cleanTitle = title.trim();
    const cleanMessage = message.trim();

    const [announcement] = await prisma.$transaction([
      prisma.announcement.create({
        data: {
          title: cleanTitle,
          message: cleanMessage,
          audience,
          createdById: req.user.id,
        },
      }),
      prisma.notification.createMany({
        data: recipients.map((r) => ({
          userId: r.id,
          title: cleanTitle,
          message: cleanMessage.slice(0, 200),
        })),
      }),
    ]);

    res.status(201).json({ announcement, notified: recipients.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.delete("/:id", authorize("ADMIN"), async (req, res) => {
  try {
    await prisma.announcement.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "Announcement deleted" });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ message: "Announcement not found" });
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;