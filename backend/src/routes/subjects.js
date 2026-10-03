import { Router } from "express";
import prisma from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

router.get("/", authorize("ADMIN"), async (req, res) => {
  try {
    const subjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });
    res.json(subjects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.post("/", authorize("ADMIN"), async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !code) {
      return res.status(400).json({ message: "Name and code are required" });
    }
    const created = await prisma.subject.create({
      data: { name: name.trim(), code: code.trim().toUpperCase() },
    });
    res.status(201).json(created);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "A subject with this name or code already exists" });
    }
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.put("/:id", authorize("ADMIN"), async (req, res) => {
  try {
    const { name, code } = req.body;
    const updated = await prisma.subject.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(name && { name: name.trim() }),
        ...(code && { code: code.trim().toUpperCase() }),
      },
    });
    res.json(updated);
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ message: "Subject not found" });
    if (error.code === "P2002") {
      return res.status(409).json({ message: "A subject with this name or code already exists" });
    }
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.delete("/:id", authorize("ADMIN"), async (req, res) => {
  try {
    await prisma.subject.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "Subject deleted" });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ message: "Subject not found" });
        if (error.code === "P2003") {
      return res.status(409).json({ message: "This subject already has exam marks, so it cannot be deleted" });
    }
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;