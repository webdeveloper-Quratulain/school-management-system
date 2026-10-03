import { Router } from "express";
import prisma from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

const STATUSES = ["UNPAID", "PARTIAL", "PAID"];
const METHODS = ["CASH", "BANK_TRANSFER", "CARD", "MOBILE_WALLET", "CHEQUE"];

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function toId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function parseDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(value);
  if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return null;
  return d;
}

// Money is handled in whole cents so we never get rounding errors
function toCents(value) {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0 || n > 99999999.99) return null;
  const cents = Math.round(n * 100);
  if (Math.abs(n * 100 - cents) > 1e-6) return null;
  return cents;
}

const centsOf = (decimal) => Math.round(Number(decimal) * 100);
const money = (cents) => (cents / 100).toFixed(2);

function startOfTodayUtc() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function shape(fee) {
  const total = centsOf(fee.amount);
  const paid = fee.payments.reduce((sum, p) => sum + centsOf(p.amount), 0);
  return {
    id: fee.id,
    studentId: fee.studentId,
    ...(fee.student && {
      student: { rollNumber: fee.student.rollNumber, name: fee.student.user.name },
    }),
    title: fee.title,
    amount: total / 100,
    dueDate: fee.dueDate,
    status: fee.status,
    paid: paid / 100,
    balance: (total - paid) / 100,
    overdue: fee.status !== "PAID" && fee.dueDate < startOfTodayUtc(),
    payments: fee.payments.map((p) => ({
      id: p.id,
      amount: centsOf(p.amount) / 100,
      paidAt: p.paidAt,
      method: p.method,
      note: p.note,
    })),
  };
}

// Totals for the admin dashboard
router.get("/summary", authorize("ADMIN"), async (req, res) => {
  try {
    const [billed, collected, overdueCount] = await Promise.all([
      prisma.fee.aggregate({ _sum: { amount: true } }),
      prisma.payment.aggregate({ _sum: { amount: true } }),
      prisma.fee.count({
        where: { status: { not: "PAID" }, dueDate: { lt: startOfTodayUtc() } },
      }),
    ]);
    const b = centsOf(billed._sum.amount ?? 0);
    const c = centsOf(collected._sum.amount ?? 0);
    res.json({
      billed: b / 100,
      collected: c / 100,
      outstanding: (b - c) / 100,
      overdueCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// A student's fees (student, their parent, or admin)
router.get("/student/:studentId", authorize("ADMIN", "STUDENT", "PARENT"), async (req, res) => {
  try {
    const studentId = toId(req.params.studentId);
    if (!studentId) return res.status(400).json({ message: "Invalid student id" });

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { parent: true },
    });
    if (!student) {
  return req.user.role === "ADMIN"
    ? res.status(404).json({ message: "Student not found" })
    : res.status(403).json({ message: "You do not have permission to view this student" });
}

    const { role, id } = req.user;
    const allowed =
      role === "ADMIN" ||
      (role === "STUDENT" && student.userId === id) ||
      (role === "PARENT" && student.parent?.userId === id);
    if (!allowed) {
      return res.status(403).json({ message: "You do not have permission to view this student" });
    }

    const fees = await prisma.fee.findMany({
      where: { studentId },
      include: { payments: { orderBy: { paidAt: "asc" } } },
      orderBy: { dueDate: "desc" },
    });

    const shaped = fees.map(shape);
    const billed = shaped.reduce((s, f) => s + Math.round(f.amount * 100), 0);
    const paid = shaped.reduce((s, f) => s + Math.round(f.paid * 100), 0);

    res.json({
      fees: shaped,
      totals: { billed: billed / 100, paid: paid / 100, balance: (billed - paid) / 100 },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Admin list with optional filters
router.get("/", authorize("ADMIN"), async (req, res) => {
  try {
    const where = {};
    if (req.query.status) {
      if (!STATUSES.includes(req.query.status)) {
        return res.status(400).json({ message: `status must be one of: ${STATUSES.join(", ")}` });
      }
      where.status = req.query.status;
    }
    if (req.query.studentId) {
      const id = toId(req.query.studentId);
      if (!id) return res.status(400).json({ message: "Invalid studentId" });
      where.studentId = id;
    }
    if (req.query.classId) {
      const id = toId(req.query.classId);
      if (!id) return res.status(400).json({ message: "Invalid classId" });
      where.student = { classId: id };
    }

    const fees = await prisma.fee.findMany({
      where,
      include: {
        payments: { orderBy: { paidAt: "asc" } },
        student: { select: { rollNumber: true, user: { select: { name: true } } } },
      },
      orderBy: { dueDate: "desc" },
      take: 200,
    });
    res.json(fees.map(shape));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

function readFeeBody(body) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const cents = toCents(body.amount);
  const due = parseDate(body.dueDate);
  if (!title || title.length > 150) return { error: "A title (max 150 characters) is required" };
  if (!cents) return { error: "amount must be a positive number with at most 2 decimals" };
  if (!due) return { error: "dueDate must be a valid date (YYYY-MM-DD)" };
  return { title, cents, due };
}

// Create a fee for one student
router.post("/", authorize("ADMIN"), async (req, res) => {
  try {
    const studentId = toId(req.body.studentId);
    if (!studentId) return res.status(400).json({ message: "studentId is required" });

    const parsed = readFeeBody(req.body);
    if (parsed.error) return res.status(400).json({ message: parsed.error });

    const fee = await prisma.fee.create({
      data: {
        studentId,
        title: parsed.title,
        amount: money(parsed.cents),
        dueDate: parsed.due,
      },
      include: { payments: true },
    });
    res.status(201).json(shape(fee));
  } catch (error) {
    if (error.code === "P2003") return res.status(400).json({ message: "That student does not exist" });
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Create the same fee for every active student in a class
router.post("/bulk", authorize("ADMIN"), async (req, res) => {
  try {
    const classId = toId(req.body.classId);
    if (!classId) return res.status(400).json({ message: "classId is required" });

    const parsed = readFeeBody(req.body);
    if (parsed.error) return res.status(400).json({ message: parsed.error });

    const students = await prisma.student.findMany({
      where: { classId, user: { isActive: true } },
      select: { id: true },
    });
    if (students.length === 0) {
      return res.status(400).json({ message: "There are no active students in this class" });
    }

    const result = await prisma.fee.createMany({
      data: students.map((s) => ({
        studentId: s.id,
        title: parsed.title,
        amount: money(parsed.cents),
        dueDate: parsed.due,
      })),
    });
    res.status(201).json({ message: `Fee created for ${result.count} student(s)` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Change the title or due date (the amount is fixed once created)
router.put("/:id", authorize("ADMIN"), async (req, res) => {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid fee id" });

    const data = {};
    if (req.body.title !== undefined) {
      const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
      if (!title || title.length > 150) {
        return res.status(400).json({ message: "Title must be 1 to 150 characters" });
      }
      data.title = title;
    }
    if (req.body.dueDate !== undefined) {
      const due = parseDate(req.body.dueDate);
      if (!due) return res.status(400).json({ message: "dueDate must be YYYY-MM-DD" });
      data.dueDate = due;
    }
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    const fee = await prisma.fee.update({
      where: { id },
      data,
      include: { payments: { orderBy: { paidAt: "asc" } } },
    });
    res.json(shape(fee));
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ message: "Fee not found" });
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Only fees with no payments can be deleted
router.delete("/:id", authorize("ADMIN"), async (req, res) => {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid fee id" });

    const fee = await prisma.fee.findUnique({ where: { id } });
    if (!fee) return res.status(404).json({ message: "Fee not found" });

    const payments = await prisma.payment.count({ where: { feeId: id } });
    if (payments > 0) {
      return res.status(409).json({ message: "This fee already has payments and cannot be deleted" });
    }

    await prisma.fee.delete({ where: { id } });
    res.json({ message: "Fee deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Record a payment
router.post("/:id/payments", authorize("ADMIN"), async (req, res) => {
  try {
    const feeId = toId(req.params.id);
    if (!feeId) return res.status(400).json({ message: "Invalid fee id" });

    const cents = toCents(req.body.amount);
    if (!cents) {
      return res.status(400).json({ message: "amount must be a positive number with at most 2 decimals" });
    }
    const { method } = req.body;
    if (!METHODS.includes(method)) {
      return res.status(400).json({ message: `method must be one of: ${METHODS.join(", ")}` });
    }
    const note = typeof req.body.note === "string" ? req.body.note.trim().slice(0, 300) : "";

    const result = await prisma.$transaction(async (tx) => {
      // Lock this fee until the transaction ends, so two simultaneous payments cannot both pass
      await tx.$queryRaw`SELECT id FROM "Fee" WHERE id = ${feeId} FOR UPDATE`;

      const fee = await tx.fee.findUnique({ where: { id: feeId } });
      if (!fee) throw httpError(404, "Fee not found");

      const agg = await tx.payment.aggregate({
        where: { feeId },
        _sum: { amount: true },
      });
      const total = centsOf(fee.amount);
      const paidBefore = centsOf(agg._sum.amount ?? 0);
      const balance = total - paidBefore;

      if (balance <= 0) throw httpError(400, "This fee is already fully paid");
      if (cents > balance) {
        throw httpError(400, `Payment is more than the remaining balance of ${balance / 100}`);
      }

      const payment = await tx.payment.create({
        data: { feeId, amount: money(cents), method, note: note || null },
      });

      const paidAfter = paidBefore + cents;
      const status = paidAfter >= total ? "PAID" : "PARTIAL";
      await tx.fee.update({ where: { id: feeId }, data: { status } });

      return { payment, status, paid: paidAfter / 100, balance: (total - paidAfter) / 100 };
    });

    res.status(201).json({
      payment: {
        id: result.payment.id,
        amount: centsOf(result.payment.amount) / 100,
        paidAt: result.payment.paidAt,
        method: result.payment.method,
        note: result.payment.note,
      },
      feeStatus: result.status,
      paid: result.paid,
      balance: result.balance,
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;