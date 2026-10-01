import { Router } from "express";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

router.get("/", async (req, res) => {
  try {
    const items = await prisma.notification.findMany({
      where: {
        userId: req.user.id,
        ...(req.query.unread === "true" && { isRead: false }),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.get("/unread-count", async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });
    res.json({ count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.patch("/read-all", async (req, res) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ updated: result.count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.patch("/:id/read", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "Invalid notification id" });
    }
    const result = await prisma.notification.updateMany({
      where: { id, userId: req.user.id },
      data: { isRead: true },
    });
    if (result.count === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json({ message: "Marked as read" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;