import { Router } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();
router.use(authenticate, authorize("ADMIN"));

router.get("/", async (req, res) => {
  try {
    const teachers = await prisma.teacher.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, isActive: true } },
      },
      orderBy: { id: "asc" },
    });
    res.json(teachers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, email, password, phone, qualification } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
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
        role: "TEACHER",
        teacher: { create: { phone, qualification } },
      },
      include: { teacher: true },
    });

    const { password: _hidden, ...safeUser } = user;
    res.status(201).json(safeUser);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "This email is already in use" });
    }
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { name, email, phone, qualification } = req.body;
    const teacher = await prisma.teacher.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(phone !== undefined && { phone }),
        ...(qualification !== undefined && { qualification }),
        user: {
          update: {
            ...(name && { name: name.trim() }),
            ...(email && { email: email.toLowerCase().trim() }),
          },
        },
      },
      include: { user: { select: { id: true, name: true, email: true, isActive: true } } },
    });
    res.json(teacher);
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ message: "Teacher not found" });
    if (error.code === "P2002") return res.status(409).json({ message: "This email is already in use" });
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { id: Number(req.params.id) } });
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    await prisma.user.update({
      where: { id: teacher.userId },
      data: { isActive: false },
    });
    res.json({ message: "Teacher deactivated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;