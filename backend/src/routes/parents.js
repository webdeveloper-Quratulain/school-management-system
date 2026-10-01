import { Router } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();
router.use(authenticate, authorize("ADMIN"));

const userFields = { id: true, name: true, email: true, isActive: true };

router.get("/", async (req, res) => {
  try {
    const parents = await prisma.parent.findMany({
      include: {
        user: { select: userFields },
        students: { include: { user: { select: { name: true } } } },
      },
      orderBy: { id: "asc" },
    });
    res.json(parents);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
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
        role: "PARENT",
        parent: { create: { phone } },
      },
      include: { parent: true },
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
    const { name, email, phone } = req.body;
    const parent = await prisma.parent.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(phone !== undefined && { phone }),
        user: {
          update: {
            ...(name && { name: name.trim() }),
            ...(email && { email: email.toLowerCase().trim() }),
          },
        },
      },
      include: { user: { select: userFields } },
    });
    res.json(parent);
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ message: "Parent not found" });
    if (error.code === "P2002") return res.status(409).json({ message: "This email is already in use" });
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const parent = await prisma.parent.findUnique({ where: { id: Number(req.params.id) } });
    if (!parent) return res.status(404).json({ message: "Parent not found" });

    await prisma.user.update({
      where: { id: parent.userId },
      data: { isActive: false },
    });
    res.json({ message: "Parent deactivated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;