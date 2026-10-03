import { Fragment, useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import Modal from "../../components/Modal";
import { useClasses } from "../../useClasses";

const METHODS = [
  ["CASH", "Cash"],
  ["BANK_TRANSFER", "Bank transfer"],
  ["CARD", "Card"],
  ["MOBILE_WALLET", "Mobile wallet"],
  ["CHEQUE", "Cheque"],
];
const STATUS_STYLE = {
  UNPAID: "bg-red-100 text-red-700",
  PARTIAL: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
};
const AMOUNT = /^\d+(\.\d{1,2})?$/;
const money = (n) => Number(n).toFixed(2);
const methodName = (m) => METHODS.find(([v]) => v === m)?.[1] ?? m;

const inputClass =
  "mb-4 w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none";
const selectClass =
  "mb-4 w-full rounded border border-slate-300 bg-white px-3 py-2 focus:border-indigo-500 focus:outline-none";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";

const emptyCreate = {
  target: "student",
  studentId: "",
  classId: "",
  title: "",
  amount: "",
  dueDate: "",
};

export default function Fees() {
  const { classes } = useClasses();
  const [fees, setFees] = useState([]);
  const [summary, setSummary] = useState(null);
  const [students, setStudents] = useState([]);
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyCreate);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (classFilter) params.set("classId", classFilter);
    if (statusFilter) params.set("status", statusFilter);
    const query = params.toString();
    try {
      const [list, totals] = await Promise.all([
        api(query ? `/fees?${query}` : "/fees"),
        api("/fees/summary"),
      ]);
      setFees(list);
      setSummary(totals);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [classFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api("/students")
      .then((list) => setStudents(list.filter((s) => s.user.isActive)))
      .catch((err) => setError(err.message));
  }, []);

  function openCreate() {
    setForm({ ...emptyCreate, classId: classFilter });
    setFormError("");
    setModal({ type: "create" });
  }

  function openEdit(fee) {
    setForm({ title: fee.title, dueDate: fee.dueDate.slice(0, 10) });
    setFormError("");
    setModal({ type: "edit", fee });
  }

  function openPay(fee) {
    setForm({ amount: String(fee.balance), method: "CASH", note: "" });
    setFormError("");
    setModal({ type: "pay", fee });
  }

  function validAmount(value) {
    return AMOUNT.test(value.trim()) && Number(value) > 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setMessage("");

    if (modal.type !== "edit" && !validAmount(form.amount)) {
      setFormError("Amount must be a positive number with at most 2 decimals");
      return;
    }

    setSaving(true);
    try {
      if (modal.type === "create") {
        const common = {
          title: form.title.trim(),
          amount: Number(form.amount),
          dueDate: form.dueDate,
        };
        if (form.target === "student") {
          if (!form.studentId) throw new Error("Choose a student");
          await api("/fees", {
            method: "POST",
            body: { ...common, studentId: Number(form.studentId) },
          });
          setMessage("Fee created");
        } else {
          if (!form.classId) throw new Error("Choose a class");
          const res = await api("/fees/bulk", {
            method: "POST",
            body: { ...common, classId: Number(form.classId) },
          });
          setMessage(res.message);
        }
      } else if (modal.type === "edit") {
        await api(`/fees/${modal.fee.id}`, {
          method: "PUT",
          body: { title: form.title.trim(), dueDate: form.dueDate },
        });
        setMessage("Fee updated");
      } else {
        const res = await api(`/fees/${modal.fee.id}/payments`, {
          method: "POST",
          body: {
            amount: Number(form.amount),
            method: form.method,
            note: form.note.trim(),
          },
        });
        setMessage(
          res.feeStatus === "PAID"
            ? "Payment recorded. This fee is now fully paid."
            : `Payment recorded. Balance remaining: ${money(res.balance)}`
        );
      }
      setModal(null);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(fee) {
    const ok = window.confirm(
      `Delete "${fee.title}" for ${fee.student.name}?\n\nThis cannot be undone.`
    );
    if (!ok) return;
    setMessage("");
    try {
      await api(`/fees/${fee.id}`, { method: "DELETE" });
      setMessage("Fee deleted");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const cards = summary
    ? [
        ["Total billed", money(summary.billed)],
        ["Collected", money(summary.collected)],
        ["Outstanding", money(summary.outstanding)],
        ["Overdue fees", summary.overdueCount],
      ]
    : [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-800">Fees</h1>
        <button
          onClick={openCreate}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Add fee
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      {message && (
        <div className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{message}</div>
      )}

      {summary && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map(([name, value]) => (
            <div key={name} className="rounded-lg bg-white p-4 shadow">
              <div className="text-xs text-slate-500">{name}</div>
              <div className="text-2xl font-semibold text-slate-800">{value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={classFilter}
          onChange={(e) => {
            setLoading(true);
            setClassFilter(e.target.value);
          }}
          aria-label="Filter by class"
          className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.section}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setLoading(true);
            setStatusFilter(e.target.value);
          }}
          aria-label="Filter by status"
          className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="UNPAID">Unpaid</option>
          <option value="PARTIAL">Partly paid</option>
          <option value="PAID">Paid</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Fee</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Balance</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && fees.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                  No fees found.
                </td>
              </tr>
            )}
            {fees.map((fee) => (
              <Fragment key={fee.id}>
                <tr className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{fee.student.name}</div>
                    <div className="text-xs text-slate-500">{fee.student.rollNumber}</div>
                  </td>
                  <td className="px-4 py-3">{fee.title}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {fee.dueDate.slice(0, 10)}
                    {fee.overdue && (
                      <span className="ml-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-medium text-white">
                        Overdue
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{money(fee.amount)}</td>
                  <td className="px-4 py-3">{money(fee.paid)}</td>
                  <td className="px-4 py-3">{money(fee.balance)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[fee.status]}`}
                    >
                      {fee.status.charAt(0) + fee.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {fee.status !== "PAID" && (
                      <button
                        onClick={() => openPay(fee)}
                        className="mr-3 text-green-700 hover:underline"
                      >
                        Record payment
                      </button>
                    )}
                    {fee.payments.length > 0 && (
                      <button
                        onClick={() => setExpanded(expanded === fee.id ? null : fee.id)}
                        className="mr-3 text-slate-600 hover:underline"
                      >
                        {expanded === fee.id ? "Hide" : "History"} ({fee.payments.length})
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(fee)}
                      className="mr-3 text-indigo-600 hover:underline"
                    >
                      Edit
                    </button>
                    {fee.payments.length === 0 && (
                      <button
                        onClick={() => handleDelete(fee)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
                {expanded === fee.id && (
                  <tr className="bg-slate-50">
                    <td colSpan={8} className="px-4 py-3">
                      <ul className="text-sm text-slate-600">
                        {fee.payments.map((p) => (
                          <li key={p.id} className="flex flex-wrap justify-between gap-2 py-0.5">
                            <span>
                              {p.paidAt.slice(0, 10)} · {methodName(p.method)}
                              {p.note ? ` · ${p.note}` : ""}
                            </span>
                            <span>{money(p.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal
          title={
            modal.type === "create"
              ? "Add fee"
              : modal.type === "edit"
                ? "Edit fee"
                : "Record payment"
          }
          onClose={() => setModal(null)}
        >
          <form onSubmit={handleSubmit}>
            {formError && (
              <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}

            {modal.type === "pay" && (
              <div className="mb-4 rounded bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <div className="font-medium">
                  {modal.fee.student.name} · {modal.fee.title}
                </div>
                <div>
                  Amount {money(modal.fee.amount)} · Paid {money(modal.fee.paid)} · Balance{" "}
                  <strong>{money(modal.fee.balance)}</strong>
                </div>
              </div>
            )}

            {modal.type === "create" && (
              <>
                <label className={labelClass} htmlFor="target">Charge</label>
                <select
                  id="target"
                  value={form.target}
                  onChange={(e) => setForm({ ...form, target: e.target.value })}
                  className={selectClass}
                >
                  <option value="student">One student</option>
                  <option value="class">Every student in a class</option>
                </select>

                {form.target === "student" ? (
                  <>
                    <label className={labelClass} htmlFor="student">Student</label>
                    <select
                      id="student"
                      value={form.studentId}
                      onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                      className={selectClass}
                    >
                      <option value="">Choose a student</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.user.name} ({s.rollNumber})
                        </option>
                      ))}
                    </select>
                  </>
                ) : (
                  <>
                    <label className={labelClass} htmlFor="class">Class</label>
                    <select
                      id="class"
                      value={form.classId}
                      onChange={(e) => setForm({ ...form, classId: e.target.value })}
                      className={selectClass}
                    >
                      <option value="">Choose a class</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.section}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </>
            )}

            {modal.type !== "pay" && (
              <>
                <label className={labelClass} htmlFor="title">Fee title</label>
                <input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  maxLength={150}
                  placeholder="October tuition"
                  className={inputClass}
                />
              </>
            )}

            {modal.type === "create" && (
              <>
                <label className={labelClass} htmlFor="amount">Amount</label>
                <input
                  id="amount"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                  placeholder="5000"
                  className={inputClass}
                />
              </>
            )}

            {modal.type !== "pay" && (
              <>
                <label className={labelClass} htmlFor="due">Due date</label>
                <input
                  id="due"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  required
                  className="mb-6 w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
                />
              </>
            )}

            {modal.type === "pay" && (
              <>
                <label className={labelClass} htmlFor="pay-amount">Amount received</label>
                <input
                  id="pay-amount"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                  className={inputClass}
                />

                <label className={labelClass} htmlFor="method">Payment method</label>
                <select
                  id="method"
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                  className={selectClass}
                >
                  {METHODS.map(([value, name]) => (
                    <option key={value} value={value}>
                      {name}
                    </option>
                  ))}
                </select>

                <label className={labelClass} htmlFor="note">Note (optional)</label>
                <input
                  id="note"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  maxLength={300}
                  placeholder="Receipt number, who paid..."
                  className="mb-6 w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
                />
              </>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}