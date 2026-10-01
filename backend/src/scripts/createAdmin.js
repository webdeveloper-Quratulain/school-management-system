import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME || "Administrator";

if (!email || !password) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env first");
  process.exit(1);
}

const existing = await prisma.user.findUnique({ where: { email } });

if (existing) {
  console.log("An admin with this email already exists");
} else {
  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, password: hashed, name, role: "ADMIN" },
  });
  console.log("Admin created:", email);
}

await prisma.$disconnect();
process.exit(0);